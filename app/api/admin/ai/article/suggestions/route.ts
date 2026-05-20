import { NextRequest, NextResponse } from 'next/server'
import { aiChat } from '@/lib/ai'
import { db } from '@/drizzle/db'
import { siteSettings } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    const { theme, theme_description } = await request.json()
    if (!theme || typeof theme !== 'string') {
      return NextResponse.json({ error: 'Tema é obrigatório' }, { status: 400 })
    }

    let briefingContent = ''
    try {
      const rows = await db
        .select()
        .from(siteSettings)
        .where(eq(siteSettings.key, 'briefing_content'))
        .limit(1)
      briefingContent = rows.length > 0 ? rows[0].value ?? '' : ''
    } catch {}

    let contextSection = ''
    if (briefingContent) {
      contextSection = `
CONTEXTO DA EMPRESA (briefing):
---
${briefingContent.slice(0, 8000)}
---

Use o contexto acima para garantir que os artigos sugeridos sejam relevantes para o negócio, produtos e público-alvo da empresa.`
    }

    const prompt = `Você é um especialista em criação de conteúdo para blogs corporativos. Com base no tema abaixo, sugira 5 ideias de artigos novos, atuais e relevantes.

Tema: "${theme}"
${theme_description ? `Descrição do tema: ${theme_description}` : ''}
${contextSection}

Requisitos:
- Os artigos devem ser diretamente relacionados ao tema "${theme}" e ao contexto da empresa
- Os títulos devem ser atrativos e otimizados para SEO
- As descrições devem explicar brevemente o que cada artigo abordará

Responda EXCLUSIVAMENTE em formato JSON válido (sem markdown, sem \`\`\`), como um array de objetos:
[{"title": "...", "description": "..."}]`

    const result = await aiChat(
      'content_generation',
      [
        {
          role: 'system',
          content:
            'Você é um assistente especializado em criação de conteúdo para blogs corporativos. Gere sugestões de artigos que sejam relevantes para o negócio e público-alvo da empresa. Sempre responda em JSON válido, sem markdown.',
        },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.8, max_tokens: 2048 }
    )

    let suggestions: { title: string; description: string }[] = []
    try {
      const cleaned = result
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      suggestions = JSON.parse(cleaned)
    } catch {
      return NextResponse.json(
        { error: 'Erro ao processar sugestões da IA' },
        { status: 500 }
      )
    }

    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      return NextResponse.json(
        { error: 'IA não retornou sugestões válidas' },
        { status: 500 }
      )
    }

    return NextResponse.json({ suggestions })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
