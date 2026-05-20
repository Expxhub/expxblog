import { NextResponse } from 'next/server'
import { db } from '@/drizzle/db'
import { siteSettings } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { aiChat } from '@/lib/ai'

export const dynamic = 'force-dynamic'

type PromptType = 'title' | 'article' | 'cta' | 'image'

const PROMPT_LABELS: Record<PromptType, string> = {
  title: 'títulos de artigos',
  article: 'artigos completos',
  cta: 'CTAs (Call to Action)',
  image: 'descrições de imagens',
}

const GENERATION_INSTRUCTIONS: Record<PromptType, string> = {
  title: `Crie um prompt de sistema (system prompt) que será usado por uma IA para gerar títulos atrativos e otimizados para SEO de artigos de blog.
O prompt deve instruir a IA a:
- Gerar títulos clicáveis e envolventes
- Considerar palavras-chave relevantes para SEO
- Manter o tamanho adequado (50-60 caracteres)
- Adaptar o tom ao público-alvo
- Variar entre formatos (como fazer, listas, perguntas, comparações, etc.)`,

  article: `Crie um prompt de sistema (system prompt) que será usado por uma IA para gerar artigos completos de blog.
O prompt deve instruir a IA a:
- Escrever artigos bem estruturados com introdução, desenvolvimento e conclusão
- Usar subtítulos (H2, H3) para organizar o conteúdo
- Incluir parágrafos curtos e escaneáveis
- Otimizar para SEO de forma natural
- Manter o tom de voz adequado ao público-alvo
- Inserir dados e exemplos quando relevante`,

  cta: `Crie um prompt de sistema (system prompt) que será usado por uma IA para gerar CTAs (Call to Action) para artigos de blog.
O prompt deve instruir a IA a:
- Criar CTAs persuasivos e contextualizados com o conteúdo
- Variar entre tipos de CTA (inscrição, download, contato, comentário, compartilhamento)
- Usar gatilhos mentais adequados (urgência, escassez, prova social)
- Manter o texto conciso e direto
- Adaptar o tom ao público-alvo`,

  image: `Crie um prompt de sistema (system prompt) que será usado por uma IA para gerar descrições detalhadas de imagens para artigos de blog.
O prompt deve instruir a IA a:
- Criar descrições ricas em detalhes visuais
- Considerar o contexto do artigo para imagens relevantes
- Incluir estilo artístico, composição, iluminação e paleta de cores
- Otimizar para geradores de imagem (DALL-E, Midjourney, etc.)
- Variar entre tipos de imagem (ilustrações, fotos, infográficos)`,
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const promptType: string = body.type

    if (!['title', 'article', 'cta', 'image'].includes(promptType)) {
      return NextResponse.json({ error: 'Tipo de prompt inválido' }, { status: 400 })
    }

    const type = promptType as PromptType

    const briefingRows = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, 'briefing_content'))
      .limit(1)

    const briefingContent = briefingRows.length > 0 ? briefingRows[0].value : ''

    let userMessage: string

    if (briefingContent.trim()) {
      userMessage = `Com base no briefing do cliente abaixo, crie um prompt de sistema otimizado para ${PROMPT_LABELS[type]}.

${GENERATION_INSTRUCTIONS[type]}

O prompt deve ser específico para o negócio e público-alvo descritos no briefing. O prompt deve estar em português e ser direto, sem explicações adicionais — apenas o texto do prompt pronto para uso.

BRIEFING DO CLIENTE:
${briefingContent.slice(0, 8000)}`
    } else {
      userMessage = `Crie um prompt de sistema (system prompt) genérico mas eficaz para ${PROMPT_LABELS[type]} em blogs de conteúdo.

${GENERATION_INSTRUCTIONS[type]}

O prompt deve estar em português e ser direto, sem explicações adicionais — apenas o texto do prompt pronto para uso.`
    }

    const generatedPrompt = await aiChat(
      'prompt_generation',
      [
        {
          role: 'system',
          content: 'Você é um especialista em engenharia de prompts (prompt engineering). Sua tarefa é criar prompts de sistema eficazes e bem estruturados para uso em produção com modelos de linguagem. Responda APENAS com o texto do prompt, sem introduções, explicações ou formatação markdown adicional.',
        },
        { role: 'user', content: userMessage },
      ],
      { max_tokens: 2048, temperature: 0.7 }
    )

    return NextResponse.json({ prompt: generatedPrompt.trim() })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
