import type { Metadata } from 'next'
import ApiDocsClient from './ApiDocsClient'

export const metadata: Metadata = {
  title: 'Documentação da API',
  description: 'Documentação completa da API pública do blog MMA',
}

export default function DocsPage() {
  return <ApiDocsClient />
}
