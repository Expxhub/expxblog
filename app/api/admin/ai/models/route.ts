import { NextResponse } from 'next/server'
import { fetchAvailableModels } from '@/lib/ai'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const models = await fetchAvailableModels()
    return NextResponse.json(models)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar modelos do OpenRouter' }, { status: 500 })
  }
}
