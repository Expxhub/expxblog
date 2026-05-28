import { NextResponse } from 'next/server'
import { fetchAvailableImageModels } from '@/lib/ai'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const models = await fetchAvailableImageModels()
    return NextResponse.json(models)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar modelos de imagem do OpenRouter' }, { status: 500 })
  }
}
