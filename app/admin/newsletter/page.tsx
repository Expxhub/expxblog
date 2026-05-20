import { getSettings } from '@/lib/settings'
import { db } from '@/drizzle/db'
import { newsletterSubscribers } from '@/drizzle/schema'
import { desc } from 'drizzle-orm'
import { NewsletterClient } from './NewsletterClient'

export const dynamic = 'force-dynamic'

export default async function NewsletterPage() {
  const { newsletter } = await getSettings()
  const subscribers = await db
    .select()
    .from(newsletterSubscribers)
    .orderBy(desc(newsletterSubscribers.subscribed_at))

  const serializable = subscribers.map((s) => ({
    ...s,
    subscribed_at: s.subscribed_at.toISOString(),
    unsubscribed_at: s.unsubscribed_at?.toISOString() ?? null,
  }))

  return <NewsletterClient initialConfig={newsletter} initialSubscribers={serializable} />
}
