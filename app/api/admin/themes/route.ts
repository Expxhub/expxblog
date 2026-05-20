import { NextResponse } from 'next/server'
import { db } from '@/drizzle/db'
import { articleThemes, siteSettings } from '@/drizzle/schema'
import { eq, desc, sql } from 'drizzle-orm'
import { aiChat } from '@/lib/ai'

export const dynamic = 'force-dynamic'

async function getSetting(key: string): Promise<string> {
  const rows = await db.select().from(siteSettings).where(eq(siteSettings.key, key)).limit(1)
  return rows.length > 0 ? rows[0].value : ''
}

export async function GET() {
  try {
    const themes = await db
      .select()
      .from(articleThemes)
      .orderBy(desc(articleThemes.created_at))

    const total = themes.length
    return NextResponse.json({ themes, total })
  } catch {
    return NextResponse.json({ error: 'Erro ao carregar temas' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action } = body as { action?: string }

    if (action === 'generate') {
      return handleGenerate(body)
    }

    const { title, description }: { title?: string; description?: string } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Título é obrigatório' }, { status: 400 })
    }

    const result = await db
      .insert(articleThemes)
      .values({
        title: title.trim(),
        description: description?.trim() || null,
        source: 'manual',
        status: 'pending',
      })
      .returning()

    return NextResponse.json({ theme: result[0] }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

async function handleGenerate(body: { customContext?: string }) {
  const briefingContent = await getSetting('briefing_content')
  const customContext = body.customContext?.trim() || ''

  if (!briefingContent && !customContext) {
    return NextResponse.json(
      { error: 'Nenhum briefing configurado. Gere o briefing na seção "Briefing" antes de sugerir temas automaticamente.' },
      { status: 400 }
    )
  }

  let userMessage = ''
  if (briefingContent) {
    userMessage += `Aqui está o briefing completo da empresa/cliente:\n\n${briefingContent}\n\n`
  }
  if (customContext) {
    userMessage += `Contexto adicional fornecido:\n\n${customContext}\n\n`
  }
  userMessage += `Com base nas informações acima, sugira entre 10 e 20 temas de artigos que sejam atuais, relevantes e altamente engajantes para o público-alvo identificado. Os temas devem estar alinhados com o que a empresa faz e com as tendências do mercado. Retorne SOMENTE um JSON array onde cada item é um objeto com "title" (título do tema) e "description" (breve descrição do tema e por que é relevante). Exemplo: [{"title":"...","description":"..."}]`

  const SYSTEM_PROMPT = `Você é um especialista em marketing de conteúdo e estratégia digital. Sua tarefa é sugerir temas de artigos quentes, relevantes e em alta para blogs corporativos.

Regras:
- Os temas devem ser específicos e acionáveis (não genéricos)
- Devem considerar tendências atuais do mercado
- Devem ser relevantes para o público-alvo identificado no briefing
- Devem estar alinhados com os produtos/serviços da empresa
- Devem ter potencial de SEO e engajamento
- Responda SOMENTE com o JSON array, sem texto adicional, sem markdown, sem \`\`\`json
- Cada tema deve ter um title claro e uma description explicando a relevância`

  const response = await aiChat(
    'theme_suggestion',
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    { max_tokens: 4096, temperature: 0.8 }
  )

  let themes: { title: string; description: string }[]
  try {
    let cleaned = response.trim()
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7)
    if (cleaned.startsWith('```')) cleaned = cleaned.slice(3)
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3)
    themes = JSON.parse(cleaned)
  } catch {
    return NextResponse.json(
      { error: 'A IA retornou um formato inesperado. Tente novamente.' },
      { status: 500 }
    )
  }

  const inserted = await db
    .insert(articleThemes)
    .values(
      themes.map((t) => ({
        title: t.title.trim(),
        description: t.description?.trim() || null,
        source: 'ai',
        status: 'pending',
      }))
    )
    .returning()

  return NextResponse.json({ themes: inserted, total: inserted.length })
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, title, description, status: themeStatus }: {
      id?: number; title?: string; description?: string; status?: string
    } = body

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
    }

    const updates: Record<string, string> = {}
    if (title !== undefined) updates.title = title.trim()
    if (description !== undefined) updates.description = description.trim()
    if (themeStatus !== undefined) updates.status = themeStatus

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
    }

    const result = await db
      .update(articleThemes)
      .set(updates)
      .where(eq(articleThemes.id, id))
      .returning()

    if (result.length === 0) {
      return NextResponse.json({ error: 'Tema não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ theme: result[0] })
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar tema' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
    }

    const result = await db
      .delete(articleThemes)
      .where(eq(articleThemes.id, Number(id)))
      .returning()

    if (result.length === 0) {
      return NextResponse.json({ error: 'Tema não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erro ao excluir tema' }, { status: 500 })
  }
}
