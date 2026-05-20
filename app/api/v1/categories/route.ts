import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/drizzle/db'
import { categories } from '@/drizzle/schema'
import { asc } from 'drizzle-orm'
import { generateSlug } from '@/lib/slug'
import { verifyApiToken } from '@/lib/api-auth'

const createSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  slug: z.string().optional(),
  description: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const auth = await verifyApiToken(request)
  if (!auth.valid) return auth.response

  try {
    const all = await db.select().from(categories).orderBy(asc(categories.name))
    return NextResponse.json({ categories: all })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyApiToken(request)
  if (!auth.valid) return auth.response

  try {
    const body = await request.json()
    const parsed = createSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { slug: rawSlug, ...data } = parsed.data
    const slug = rawSlug || generateSlug(data.name)

    const [category] = await db.insert(categories).values({ ...data, slug }).returning()
    return NextResponse.json({ category }, { status: 201 })
  } catch (err: unknown) {
    if ((err as { code?: string }).code === '23505') {
      return NextResponse.json({ error: 'Categoria já existe.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
