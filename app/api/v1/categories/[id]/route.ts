import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/drizzle/db'
import { categories, postCategories } from '@/drizzle/schema'
import { eq, count } from 'drizzle-orm'
import { verifyApiToken } from '@/lib/api-auth'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().optional(),
  description: z.string().optional().nullable(),
})

function parseId(id: string): number | null {
  const n = parseInt(id, 10)
  return isNaN(n) || n <= 0 ? null : n
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyApiToken(request)
  if (!auth.valid) return auth.response

  try {
    const id = parseId(params.id)
    if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const [category] = await db.select().from(categories).where(eq(categories.id, id)).limit(1)
    if (!category) return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 })

    return NextResponse.json({ category })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyApiToken(request)
  if (!auth.valid) return auth.response

  try {
    const id = parseId(params.id)
    if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const [category] = await db
      .update(categories)
      .set(parsed.data)
      .where(eq(categories.id, id))
      .returning()

    if (!category) {
      return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 })
    }

    return NextResponse.json({ category })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyApiToken(request)
  if (!auth.valid) return auth.response

  try {
    const id = parseId(params.id)
    if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const [{ total }] = await db
      .select({ total: count() })
      .from(postCategories)
      .where(eq(postCategories.category_id, id))

    if (total > 0) {
      return NextResponse.json(
        { error: `Categoria possui ${total} post(s) associado(s). Remova as associações antes de excluir.` },
        { status: 409 }
      )
    }

    await db.delete(categories).where(eq(categories.id, id))
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
