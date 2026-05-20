import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/drizzle/db'
import { apiTokens } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import crypto from 'crypto'

export async function verifyApiToken(request: NextRequest): Promise<{ valid: true; tokenId: number } | { valid: false; response: NextResponse }> {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return {
      valid: false,
      response: NextResponse.json(
        { error: 'Token de API ausente. Envie o header Authorization: Bearer <token>' },
        { status: 401 }
      ),
    }
  }

  const [found] = await db.select().from(apiTokens).where(eq(apiTokens.token, token)).limit(1)

  if (!found || found.active !== 'true') {
    return {
      valid: false,
      response: NextResponse.json({ error: 'Token de API inválido ou desativado' }, { status: 401 }),
    }
  }

  await db
    .update(apiTokens)
    .set({ last_used_at: new Date() })
    .where(eq(apiTokens.id, found.id))

  return { valid: true, tokenId: found.id }
}

export function generateApiToken(): string {
  return `mma_${crypto.randomBytes(32).toString('hex')}`
}
