import { getSettings } from '@/lib/settings'
import { getDefaultModels, getAIApiKey, getAIModelFromDB } from '@/lib/ai'
import { ConfiguracoesClient } from './ConfiguracoesClient'

export default async function ConfiguracoesPage() {
  const settings = await getSettings()
  const aiApiKey = (await getAIApiKey()) ?? ''

  const defaults = getDefaultModels()
  const aiModels: Record<string, string> = {}
  for (const feature of Object.keys(defaults)) {
    aiModels[feature] = await getAIModelFromDB(feature)
  }

  return <ConfiguracoesClient initial={settings.company} initialAI={{ api_key: aiApiKey, models: aiModels }} />
}
