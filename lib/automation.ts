import { db } from '@/drizzle/db'
import { automationConfig } from '@/drizzle/schema'
import { createPipelineStream } from '@/lib/agent-pipeline'
import type { PipelineEvent } from '@/lib/agents/types'

export type AutomationResult = {
  success: boolean
  message: string
  post_id?: number
  skipped?: boolean
  image_error?: string
}

export async function getOrCreateAutomationConfig() {
  const rows = await db.select().from(automationConfig).limit(1)
  if (rows.length > 0) return rows[0]
  const [row] = await db.insert(automationConfig).values({}).returning()
  return row
}

export async function runAutomationCycle(force = false): Promise<AutomationResult> {
  const config = await getOrCreateAutomationConfig()

  if (!config.enabled) {
    return { success: false, skipped: true, message: 'Automação desabilitada' }
  }

  if (!force && config.next_run_at && new Date() < new Date(config.next_run_at)) {
    return { success: false, skipped: true, message: 'Ainda não está na hora de executar' }
  }

  let themeIds: number[] = []
  try {
    themeIds = JSON.parse(config.theme_ids)
    if (!Array.isArray(themeIds)) themeIds = []
  } catch {}

  const stream = createPipelineStream({
    themeIds,
    triggers: { publishStatus: 'published' },
  })

  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let lastEvent: PipelineEvent | null = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''
    for (const part of parts) {
      const line = part.replace(/^data: /, '').trim()
      if (!line) continue
      try {
        lastEvent = JSON.parse(line) as PipelineEvent
      } catch {}
    }
  }

  if (!lastEvent) return { success: false, message: 'Pipeline não retornou resultado' }

  if (lastEvent.type === 'pipeline_done') {
    return {
      success: true,
      message: lastEvent.message,
      post_id: (lastEvent.data?.post_id as number | undefined),
    }
  }

  return { success: false, message: lastEvent.message }
}
