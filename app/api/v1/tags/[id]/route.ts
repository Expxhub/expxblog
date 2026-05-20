import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/drizzle/db'
import { tags } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { verifyApiToken } from '@/lib/api-auth'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().optional(),
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

    const [tag] = await db.select().from(tags).where(eq(tags.id, id)).limit(1)
    if (!tag) return NextResponse.json({ error: 'Tag não encontrada' }, { status: 404 })

    return NextResponse.json({ tag })
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

    const [tag] = await db
      .update(tags)
      .set(parsed.data)
      .where(eq(tags.id, id))
      .returning()

    if (!tag) {
      return NextResponse.json({ error: 'Tag não encontrada' }, { status: 404 })
    }

    return NextResponse.json({ tag })
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

    const existing = await db.select().from(tags).where(eq(tags.id, id)).limit(1)
    if (!existing.length) {
      return NextResponse.json({ error: 'Tag não encontrada' }, { status: 404 })
    }

    await db.delete(tags).where(eq(tags.id, id))
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
