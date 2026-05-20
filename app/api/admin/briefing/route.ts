import { NextResponse } from 'next/server'
import { db } from '@/drizzle/db'
import { siteSettings } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { aiChat } from '@/lib/ai'

export const dynamic = 'force-dynamic'

async function upsertSetting(key: string, value: string) {
  const now = new Date()
  await db
    .insert(siteSettings)
    .values({ key, value, updated_at: now })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value, updated_at: now } })
}

async function getSetting(key: string): Promise<string> {
  const rows = await db.select().from(siteSettings).where(eq(siteSettings.key, key)).limit(1)
  return rows.length > 0 ? rows[0].value : ''
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|h[1-6]|li|tr)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim()
}

function extractInternalLinks(html: string, domain: string): string[] {
  const regex = /href=["'](\/[^"']*?)["']/gi
  const links: string[] = []
  let match
  while ((match = regex.exec(html)) !== null) {
    try {
      const full = new URL(match[1], `https://${domain}`).href
      if (new URL(full).hostname === domain && !links.includes(full)) {
        links.push(full)
      }
    } catch {}
  }
  const absRegex = /href=["'](https?:\/\/[^"']+?)["']/gi
  while ((match = absRegex.exec(html)) !== null) {
    try {
      const u = new URL(match[1])
      if (u.hostname === domain && !links.includes(match[1])) {
        links.push(match[1])
      }
    } catch {}
  }
  return links
}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(10000),
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; MMABlogBot/1.0)',
      Accept: 'text/html',
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

async function crawlWebsite(baseUrl: string): Promise<string> {
  let domain: string
  try {
    domain = new URL(baseUrl).hostname
  } catch {
    throw new Error('URL inválida')
  }

  const mainHtml = await fetchPage(baseUrl)
  const mainText = htmlToText(mainHtml)
  const links = extractInternalLinks(mainHtml, domain)

  const skipExt = /\.(png|jpg|jpeg|gif|svg|css|js|ico|pdf|zip|mp4|mp3|woff|woff2|ttf|eot)(\?|$)/i
  const filtered = links.filter((l) => !skipExt.test(l)).slice(0, 12)

  const subTexts: string[] = []
  for (const link of filtered) {
    try {
      const html = await fetchPage(link)
      const text = htmlToText(html)
      if (text.length > 100) {
        subTexts.push(`--- Página: ${link} ---\n${text.slice(0, 3000)}`)
      }
    } catch {}
  }

  const allText = [`--- Página principal: ${baseUrl} ---\n${mainText.slice(0, 5000)}`, ...subTexts].join('\n\n')
  return allText.slice(0, 30000)
}

const SYSTEM_PROMPT = `Você é um estrategista de conteúdo digital especializado em criar briefings para blogs corporativos.

Com base no conteúdo do site da empresa fornecido, você deve gerar um briefing completo e detalhado contendo:

1. **Sobre a Empresa** — Resumo do que a empresa faz, seus produtos/serviços, mercado de atuação e posicionamento.
2. **Público-Alvo** — Perfil detalhado do público-alvo (demografia, interesses, dores, necessidades).
3. **Objetivos de Conteúdo** — Quais objetivos estratégicos o blog deve atender (autoridade, geração de leads, educação, engajamento).
4. **Pilares de Conteúdo** — Sugestão de 4 a 6 pilares temáticos relevantes para o nicho da empresa.
5. **Tom e Estilo** — Recomendações de tom de voz, estilo de escrita e formato preferencial dos artigos.
6. **Sugestões de Artigos** — Liste 15 a 20 ideias de títulos de artigos relevantes que poderiam ser produzidos, organizados por pilar de conteúdo.
7. **Palavras-chave** — Sugira palavras-chave e temas relevantes para SEO dentro do nicho.

Responda em português brasileiro. Seja detalhado e estratégico.`

export async function GET() {
  try {
    const url = await getSetting('briefing_url')
    const content = await getSetting('briefing_content')
    return NextResponse.json({ url, briefing: content })
  } catch {
    return NextResponse.json({ error: 'Erro ao carregar briefing' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const url: string = body.url

    if (!url) {
      return NextResponse.json({ error: 'URL é obrigatória' }, { status: 400 })
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json({ error: 'URL inválida' }, { status: 400 })
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: 'A URL deve começar com http:// ou https://' }, { status: 400 })
    }

    const siteContent = await crawlWebsite(url)

    if (!siteContent.trim()) {
      return NextResponse.json({ error: 'Não foi possível extrair conteúdo do site informado.' }, { status: 400 })
    }

    const briefing = await aiChat(
      'briefing_generation',
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Analise o conteúdo do site da empresa abaixo e gere um briefing completo:\n\n${siteContent}` },
      ],
      { max_tokens: 4096 }
    )

    await upsertSetting('briefing_url', url)
    await upsertSetting('briefing_content', briefing)

    return NextResponse.json({ briefing })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { url, briefing }: { url?: string; briefing?: string } = body

    if (url !== undefined) await upsertSetting('briefing_url', url)
    if (briefing !== undefined) await upsertSetting('briefing_content', briefing)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erro ao salvar briefing' }, { status: 500 })
  }
}
