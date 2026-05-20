import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { aiChat, callOpenRouterImage, getPromptFromDB } from '@/lib/ai'
import { supabaseAdmin, STORAGE_BUCKET } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const token = cookies().get('auth_token')?.value
  if (!token || !(await verifyToken(token))) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const body = await request.json()
  const { title, excerpt, content } = body as {
    title?: string
    excerpt?: string
    content?: string
  }

  if (!title) {
    return NextResponse.json({ error: 'Título do artigo é obrigatório' }, { status: 400 })
  }

  try {
    const imagePromptTemplate = await getPromptFromDB('image')

    const contextParts = [`Título do artigo: ${title}`]
    if (excerpt) contextParts.push(`Resumo: ${excerpt}`)
    if (content) {
      const textContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000)
      contextParts.push(`Conteúdo do artigo: ${textContent}`)
    }

    let finalPrompt: string

    if (imagePromptTemplate) {
      const promptMessages = [
        {
          role: 'system' as const,
          content:
            'Você é um especialista em criar prompts para geração de imagens por IA. Receba o prompt template e o contexto do artigo, e gere um prompt em inglês otimizado para gerar uma imagem de capa profissional e atraente para o artigo. Responda APENAS com o prompt, sem explicações.',
        },
        {
          role: 'user' as const,
          content: `${imagePromptTemplate}\n\nContexto do artigo:\n${contextParts.join('\n')}`,
        },
      ]
      finalPrompt = await aiChat('image_description', promptMessages, {
        temperature: 0.8,
        max_tokens: 500,
      })
    } else {
      const fallbackMessages = [
        {
          role: 'system' as const,
          content:
            'Você é um especialista em criar prompts para geração de imagens por IA. Gere um prompt em inglês para criar uma imagem de capa profissional e atraente para o artigo descrito. A imagem deve ser adequada para um blog, em estilo fotorealista ou ilustração editorial. Responda APENAS com o prompt, sem explicações.',
        },
        {
          role: 'user' as const,
          content: contextParts.join('\n'),
        },
      ]
      finalPrompt = await aiChat('image_description', fallbackMessages, {
        temperature: 0.8,
        max_tokens: 500,
      })
    }

    if (!finalPrompt) {
      return NextResponse.json({ error: 'Falha ao gerar prompt de imagem' }, { status: 500 })
    }

    const imageUrl = await callOpenRouterImage(finalPrompt)

    let imageBuffer: Buffer
    let contentType = 'image/png'

    if (imageUrl.startsWith('data:')) {
      const matches = imageUrl.match(/^data:(image\/\w+);base64,(.+)$/)
      if (!matches) {
        return NextResponse.json({ error: 'Formato de imagem inválido' }, { status: 500 })
      }
      contentType = matches[1]
      imageBuffer = Buffer.from(matches[2], 'base64')
    } else {
      const imageRes = await fetch(imageUrl)
      if (!imageRes.ok) {
        return NextResponse.json({ error: 'Falha ao baixar imagem gerada' }, { status: 500 })
      }
      contentType = imageRes.headers.get('content-type') ?? 'image/png'
      imageBuffer = Buffer.from(await imageRes.arrayBuffer())
    }

    const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? '.jpg' : contentType.includes('webp') ? '.webp' : '.png'
    const filename = `ai-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(filename, imageBuffer, { contentType })

    if (uploadError) {
      console.error('Supabase upload error:', uploadError)
      return NextResponse.json({ error: 'Erro ao salvar imagem gerada' }, { status: 500 })
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(filename)

    return NextResponse.json({ url: publicUrl })
  } catch (err) {
    console.error('AI image generation error:', err)
    const message = err instanceof Error ? err.message : 'Erro ao gerar imagem com IA'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
