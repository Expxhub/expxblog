import 'dotenv/config'
import { client } from '../drizzle/db'

async function main() {
  await client`
    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      subscribed_at TIMESTAMP NOT NULL DEFAULT now(),
      unsubscribed_at TIMESTAMP
    )
  `
  await client`CREATE INDEX IF NOT EXISTS newsletter_email_idx ON newsletter_subscribers (email)`
  await client`CREATE INDEX IF NOT EXISTS newsletter_status_idx ON newsletter_subscribers (status)`
  console.log('✅ Tabela newsletter_subscribers criada com sucesso.')
  await client.end()
}

main().catch((err) => { console.error(err); process.exit(1) })
