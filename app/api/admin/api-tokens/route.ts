import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/drizzle/db'
import { apiTokens } from '@/drizzle/schema'
import { desc } from 'drizzle-orm'
import { generateApiToken } from '@/lib/api-auth'

const createSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(100),
})

export async function GET() {
  try {
    const all = await db
      .select({
        id: apiTokens.id,
        name: apiTokens.name,
        token: apiTokens.token,
        active: apiTokens.active,
        last_used_at: apiTokens.last_used_at,
        created_at: apiTokens.created_at,
      })
      .from(apiTokens)
      .orderBy(desc(apiTokens.created_at))

    return NextResponse.json({ tokens: all })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = createSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const token = generateApiToken()
    const [created] = await db
      .insert(apiTokens)
      .values({ name: parsed.data.name, token })
      .returning()

    return NextResponse.json({ token: created }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
