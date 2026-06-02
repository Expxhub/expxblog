// lib/source-crawlers/handlers/docs.ts
import { getFirecrawlApiKey } from '@/lib/firecrawl'
import { callOpenRouter, getAIApiKey } from '@/lib/ai'
import type { CrawlerHandlerOptions, CrawlerHandlerResult } from '../types'

interface PageEntry {
  url: string
  title: string
  description: string
}

async function discoverPages(baseUrl: string, firecrawlKey: string): Promise<PageEntry[]> {
  const resp = await fetch('https://api.firecrawl.dev/v1/map', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${firecrawlKey}` },
    body: JSON.stringify({ url: baseUrl, limit: 30 }),
  })
  if (!resp.ok) throw new Error(`Firecrawl map error: ${resp.status}`)
  const data = await resp.json() as { links?: string[] }
  return (data.links ?? []).map((u) => ({ url: u, title: u, description: '' }))
}

async function scrapeContent(url: string, firecrawlKey: string): Promise<string> {
  const resp = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${firecrawlKey}` },
    body: JSON.stringify({ url, formats: ['markdown'] }),
  })
  if (!resp.ok) throw new Error(`Firecrawl scrape error: ${resp.status}`)
  const data = await resp.json() as { data?: { markdown?: string } }
  return data.data?.markdown ?? ''
}

async function pickPage(pages: PageEntry[], prompt: string, apiKey: string): Promise<PageEntry> {
  if (pages.length === 1) return pages[0]
  const list = pages.map((p, i) => `${i + 1}. ${p.url}`).join('\n')
  const resp = await callOpenRouter(
    {
      model: 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: `Você é um curador de conteúdo para um blog. ${prompt}\n\nEscolha a página de documentação mais adequada para gerar um artigo de blog interessante. Responda APENAS com o número da opção escolhida (ex: 3).` },
        { role: 'user', content: `Páginas disponíveis:\n${list}` },
      ],
      temperature: 0.3,
      max_tokens: 10,
    },
    apiKey
  )
  const raw = resp.choices[0]?.message?.content?.trim() ?? '1'
  const idx = parseInt(raw, 10) - 1
  return pages[Math.max(0, Math.min(idx, pages.length - 1))]
}

export async function runDocsHandler(opts: CrawlerHandlerOptions): Promise<CrawlerHandlerResult> {
  const firecrawlKey = await getFirecrawlApiKey()
  if (!firecrawlKey) throw new Error('Firecrawl API key não configurada')
  const apiKey = await getAIApiKey()
  if (!apiKey) throw new Error('AI API key não configurada')

  const pages = await discoverPages(opts.url, firecrawlKey)
  const fresh = pages.filter((p) => !opts.alreadyProcessedKeys.includes(p.url))
  if (fresh.length === 0) throw new Error('Nenhuma página nova encontrada')

  const chosen = await pickPage(fresh, opts.prompt, apiKey)
  const content = await scrapeContent(chosen.url, firecrawlKey)
  if (!content) throw new Error(`Falha ao raspar conteúdo de ${chosen.url}`)

  return {
    chosen: {
      key: chosen.url,
      title: chosen.title || chosen.url,
      content,
      url: chosen.url,
    },
  }
}
