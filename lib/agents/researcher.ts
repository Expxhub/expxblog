// lib/agents/researcher.ts
import { callOpenRouter } from '@/lib/ai'
import { getAgentConfig } from '@/lib/agent-configs'
import { AgentContext, AgentResult } from '@/lib/agents/types'

function extractUrls(text: string): string[] {
  // Try JSON parse first (handles ```json blocks too)
  try {
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const parsed = JSON.parse(cleaned) as { urls?: unknown }
    if (Array.isArray(parsed.urls)) {
      const urls = parsed.urls.filter((u): u is string => typeof u === 'string' && u.startsWith('http'))
      if (urls.length > 0) return urls.slice(0, 8)
    }
  } catch { /* fallthrough */ }

  // Try extracting JSON array from anywhere in the text
  const arrayMatch = text.match(/\[\s*"https?:\/\/[^\]]+\]/)
  if (arrayMatch) {
    try {
      const arr = JSON.parse(arrayMatch[0]) as unknown[]
      const urls = arr.filter((u): u is string => typeof u === 'string' && u.startsWith('http'))
      if (urls.length > 0) return urls.slice(0, 8)
    } catch { /* fallthrough */ }
  }

  // Last resort: regex grab every URL in the text
  const matches = text.match(/https?:\/\/[^\s"',\]>)\n]+/g) ?? []
  return matches.slice(0, 8)
}

export async function runResearcherAgent(
  ctx: AgentContext,
  apiKey: string
): Promise<AgentResult> {
  if (!ctx.headline) return { success: false, message: 'Headline não disponível', error: 'NO_HEADLINE' }

  const config = await getAgentConfig('researcher')

  const resp = await callOpenRouter(
    {
      model: config.model,
      messages: [
        { role: 'system', content: config.prompt },
        {
          role: 'user',
          content: `Título do artigo: ${ctx.headline}${ctx.themeTitle ? `\nTema: ${ctx.themeTitle}` : ''}\n\nResponda APENAS em JSON válido: { "urls": ["https://...", "https://...", ...] }`,
        },
      ],
      temperature: 0.5,
      max_tokens: 800,
    },
    apiKey
  )

  const raw = resp.choices[0]?.message?.content ?? ''
  const suggestedUrls = extractUrls(raw)

  // Merge with any links already seeded (e.g. from URL-based generation)
  const seeded = ctx.researchLinks ?? []
  const allLinks = [...seeded]
  for (const u of suggestedUrls) {
    if (!allLinks.includes(u)) allLinks.push(u)
  }

  const researchLinks = allLinks.slice(0, 8)

  return {
    success: true,
    message: `${researchLinks.length} referências identificadas`,
    data: { researchLinks },
    ...(researchLinks.length === 0 ? { error: `Modelo retornou: ${raw.slice(0, 200)}` } : {}),
  }
}
