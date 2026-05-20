import { NextResponse } from 'next/server'
import { db } from '@/drizzle/db'
import { siteSettings } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

interface DefaultPrompts {
  title: string
  article: string
  cta: string
  image: string
}

const EMPTY_PROMPTS: DefaultPrompts = { title: '', article: '', cta: '', image: '' }

async function getPrompts(): Promise<DefaultPrompts> {
  const rows = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.key, 'ai_default_prompts'))
    .limit(1)

  if (rows.length > 0 && rows[0].value) {
    try {
      return { ...EMPTY_PROMPTS, ...JSON.parse(rows[0].value) }
    } catch {
      return EMPTY_PROMPTS
    }
  }
  return EMPTY_PROMPTS
}

export async function GET() {
  try {
    const prompts = await getPrompts()
    return NextResponse.json({ prompts })
  } catch {
    return NextResponse.json({ error: 'Erro ao carregar prompts' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { title, article, cta, image }: Partial<DefaultPrompts> = body

    const prompts: DefaultPrompts = {
      title: title ?? '',
      article: article ?? '',
      cta: cta ?? '',
      image: image ?? '',
    }

    const now = new Date()
    await db
      .insert(siteSettings)
      .values({ key: 'ai_default_prompts', value: JSON.stringify(prompts), updated_at: now })
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: { value: JSON.stringify(prompts), updated_at: now },
      })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erro ao salvar prompts' }, { status: 500 })
  }
}
