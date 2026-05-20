'use client'

import { useState, useEffect } from 'react'

interface Endpoint {
  method: string
  path: string
  summary: string
  description: string
  parameters?: { name: string; in: string; required: boolean; schema: { type: string; default?: string | number; enum?: string[]; maximum?: number }; description: string }[]
  requestBody?: { content: { 'application/json': { schema: Record<string, unknown> } } }
  responses: Record<string, { description: string }>
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-green-100 text-green-800',
  POST: 'bg-blue-100 text-blue-800',
  PUT: 'bg-yellow-100 text-yellow-800',
  PATCH: 'bg-orange-100 text-orange-800',
  DELETE: 'bg-red-100 text-red-800',
}

const examples: Record<string, Record<string, unknown>> = {
  'POST /api/v1/posts': {
    title: 'Meu novo post',
    content: '<p>Conteúdo do post em HTML</p>',
    excerpt: 'Resumo do post',
    status: 'draft',
    category_ids: [1],
    tag_ids: [1, 2],
  },
  'PUT /api/v1/posts/{id}': {
    title: 'Título atualizado',
    status: 'published',
    category_ids: [1, 2],
  },
  'POST /api/v1/categories': {
    name: 'Nova Categoria',
    description: 'Descrição da categoria',
  },
  'PUT /api/v1/categories/{id}': {
    name: 'Categoria atualizada',
  },
  'POST /api/v1/tags': {
    name: 'Nova Tag',
  },
  'PUT /api/v1/tags/{id}': {
    name: 'Tag atualizada',
  },
}

export default function ApiDocsClient() {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    Posts: true,
    Categorias: false,
    Tags: false,
  })
  const [baseUrl, setBaseUrl] = useState('')

  useEffect(() => {
    setBaseUrl(window.location.origin)
  }, [])

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const sections: { title: string; tag: string; endpoints: Endpoint[] }[] = [
    {
      title: 'Posts',
      tag: 'Posts',
      endpoints: [
        {
          method: 'GET',
          path: '/api/v1/posts',
          summary: 'Listar posts',
          description: 'Retorna uma lista paginada de posts. Por padrão retorna apenas posts publicados. Use status=all para ver rascunhos também.',
          parameters: [
            { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 }, description: 'Número da página' },
            { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 10, maximum: 50 }, description: 'Itens por página (máx: 50)' },
            { name: 'status', in: 'query', required: false, schema: { type: 'string', default: 'published', enum: ['draft', 'published', 'all'] }, description: 'Filtrar por status' },
          ],
          responses: { '200': { description: 'Lista paginada de posts' }, '401': { description: 'Token ausente ou inválido' } },
        },
        {
          method: 'POST',
          path: '/api/v1/posts',
          summary: 'Criar post',
          description: 'Cria um novo post. O slug é gerado automaticamente a partir do título se não informado. O conteúdo HTML é sanitizado no servidor.',
          responses: { '201': { description: 'Post criado' }, '400': { description: 'Dados inválidos' }, '409': { description: 'Slug já existe' } },
        },
        {
          method: 'GET',
          path: '/api/v1/posts/{id}',
          summary: 'Obter post por ID',
          description: 'Retorna os detalhes de um post, incluindo categorias e tags associadas.',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'ID do post' },
          ],
          responses: { '200': { description: 'Detalhes do post com categorias e tags' }, '404': { description: 'Post não encontrado' } },
        },
        {
          method: 'PUT',
          path: '/api/v1/posts/{id}',
          summary: 'Atualizar post',
          description: 'Atualiza os dados de um post. Ao publicar pela primeira vez, published_at é definido automaticamente.',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'ID do post' },
          ],
          responses: { '200': { description: 'Post atualizado' }, '404': { description: 'Post não encontrado' } },
        },
        {
          method: 'DELETE',
          path: '/api/v1/posts/{id}',
          summary: 'Excluir post',
          description: 'Remove um post permanentemente junto com suas associações de categorias e tags.',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'ID do post' },
          ],
          responses: { '200': { description: 'Post excluído com sucesso' }, '404': { description: 'Post não encontrado' } },
        },
      ],
    },
    {
      title: 'Categorias',
      tag: 'Categorias',
      endpoints: [
        {
          method: 'GET',
          path: '/api/v1/categories',
          summary: 'Listar categorias',
          description: 'Retorna todas as categorias ordenadas por nome.',
          responses: { '200': { description: 'Lista de categorias' } },
        },
        {
          method: 'POST',
          path: '/api/v1/categories',
          summary: 'Criar categoria',
          description: 'Cria uma nova categoria. O slug é gerado automaticamente.',
          responses: { '201': { description: 'Categoria criada' }, '409': { description: 'Categoria já existe' } },
        },
        {
          method: 'GET',
          path: '/api/v1/categories/{id}',
          summary: 'Obter categoria por ID',
          description: 'Retorna os detalhes de uma categoria.',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'ID da categoria' },
          ],
          responses: { '200': { description: 'Detalhes da categoria' }, '404': { description: 'Categoria não encontrada' } },
        },
        {
          method: 'PUT',
          path: '/api/v1/categories/{id}',
          summary: 'Atualizar categoria',
          description: 'Atualiza os dados de uma categoria.',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'ID da categoria' },
          ],
          responses: { '200': { description: 'Categoria atualizada' }, '404': { description: 'Categoria não encontrada' } },
        },
        {
          method: 'DELETE',
          path: '/api/v1/categories/{id}',
          summary: 'Excluir categoria',
          description: 'Remove uma categoria. Não é possível excluir categorias com posts associados.',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'ID da categoria' },
          ],
          responses: { '200': { description: 'Categoria excluída' }, '409': { description: 'Categoria possui posts associados' } },
        },
      ],
    },
    {
      title: 'Tags',
      tag: 'Tags',
      endpoints: [
        {
          method: 'GET',
          path: '/api/v1/tags',
          summary: 'Listar tags',
          description: 'Retorna todas as tags ordenadas por nome.',
          responses: { '200': { description: 'Lista de tags' } },
        },
        {
          method: 'POST',
          path: '/api/v1/tags',
          summary: 'Criar tag',
          description: 'Cria uma nova tag. O slug é gerado automaticamente.',
          responses: { '201': { description: 'Tag criada' }, '409': { description: 'Tag já existe' } },
        },
        {
          method: 'GET',
          path: '/api/v1/tags/{id}',
          summary: 'Obter tag por ID',
          description: 'Retorna os detalhes de uma tag.',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'ID da tag' },
          ],
          responses: { '200': { description: 'Detalhes da tag' }, '404': { description: 'Tag não encontrada' } },
        },
        {
          method: 'PUT',
          path: '/api/v1/tags/{id}',
          summary: 'Atualizar tag',
          description: 'Atualiza os dados de uma tag.',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'ID da tag' },
          ],
          responses: { '200': { description: 'Tag atualizada' }, '404': { description: 'Tag não encontrada' } },
        },
        {
          method: 'DELETE',
          path: '/api/v1/tags/{id}',
          summary: 'Excluir tag',
          description: 'Remove uma tag permanentemente.',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'ID da tag' },
          ],
          responses: { '200': { description: 'Tag excluída' }, '404': { description: 'Tag não encontrada' } },
        },
      ],
    },
  ]

  function getExample(path: string, method: string): Record<string, unknown> | null {
    const key = `${method} ${path}`
    return examples[key] ?? null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-neutral-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">API do Blog</h1>
              <p className="text-gray-400 mt-2">Documentação completa da API REST para integração</p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="/api/v1/docs"
                target="_blank"
                download="openapi.json"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                Baixar OpenAPI JSON
              </a>
              <a
                href="/admin/api"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-brand-primary hover:bg-brand-primary-dark transition-colors"
              >
                Gerenciar Tokens
              </a>
            </div>
          </div>
          <div className="mt-6 p-4 bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-400 mb-1">URL Base</p>
            <code className="text-lg font-mono text-green-400">{baseUrl}/api/v1</code>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <section className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-bold text-neutral-900 mb-4">Autenticação</h2>
          <div className="prose prose-sm max-w-none text-gray-600">
            <p>
              Todas as requisições à API devem incluir um token de acesso no header <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">Authorization</code>.
              Os tokens são gerados pelo painel administrativo em <a href="/admin/api" className="text-brand-primary hover:underline">Admin &gt; API</a>.
            </p>
            <div className="mt-4 bg-gray-900 rounded-lg p-4">
              <pre className="text-green-400 text-sm font-mono">
{`curl -H "Authorization: Bearer mma_seu_token_aqui" \\
     ${baseUrl}/api/v1/posts`}
              </pre>
            </div>
          </div>
        </section>

        {sections.map((section) => (
          <div key={section.tag} className="mb-6">
            <button
              onClick={() => toggleSection(section.tag)}
              className="w-full flex items-center justify-between bg-white rounded-t-xl border border-gray-200 px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <h2 className="text-lg font-bold text-neutral-900">{section.title}</h2>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${openSections[section.tag] ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {openSections[section.tag] && (
              <div className="border border-t-0 border-gray-200 rounded-b-xl overflow-hidden">
                {section.endpoints.map((ep, i) => (
                  <div key={`${ep.method}-${ep.path}`} className={`${i > 0 ? 'border-t border-gray-200' : ''}`}>
                    <div className="px-6 py-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${METHOD_COLORS[ep.method]}`}>
                          {ep.method}
                        </span>
                        <code className="text-sm font-mono text-neutral-900">{ep.path}</code>
                      </div>
                      <h3 className="font-semibold text-neutral-900">{ep.summary}</h3>
                      <p className="text-sm text-gray-600 mt-1">{ep.description}</p>

                      {ep.parameters && ep.parameters.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Parâmetros</h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-gray-200">
                                  <th className="text-left py-2 pr-4 font-medium text-gray-600">Nome</th>
                                  <th className="text-left py-2 pr-4 font-medium text-gray-600">Local</th>
                                  <th className="text-left py-2 pr-4 font-medium text-gray-600">Tipo</th>
                                  <th className="text-left py-2 pr-4 font-medium text-gray-600">Obrigatório</th>
                                  <th className="text-left py-2 font-medium text-gray-600">Descrição</th>
                                </tr>
                              </thead>
                              <tbody>
                                {ep.parameters.map((param) => (
                                  <tr key={param.name} className="border-b border-gray-100">
                                    <td className="py-2 pr-4 font-mono text-brand-primary">{param.name}</td>
                                    <td className="py-2 pr-4 text-gray-500">{param.in}</td>
                                    <td className="py-2 pr-4">
                                      <span className="text-gray-600">{param.schema.type}</span>
                                      {param.schema.enum && (
                                        <span className="ml-1 text-gray-400">
                                          [{param.schema.enum.join(', ')}]
                                        </span>
                                      )}
                                      {param.schema.default !== undefined && (
                                        <span className="ml-1 text-gray-400">= {String(param.schema.default)}</span>
                                      )}
                                    </td>
                                    <td className="py-2 pr-4">
                                      {param.required ? (
                                        <span className="text-red-600 font-medium">Sim</span>
                                      ) : (
                                        <span className="text-gray-400">Não</span>
                                      )}
                                    </td>
                                    <td className="py-2 text-gray-600">{param.description}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {getExample(ep.path, ep.method) && (
                        <div className="mt-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Exemplo de requisição</h4>
                          <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                            <pre className="text-sm font-mono text-gray-300">
                              {`curl -X ${ep.method} ${baseUrl}${ep.path.replace('{id}', '1')} \\
  -H "Authorization: Bearer mma_seu_token" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(getExample(ep.path, ep.method), null, 2)}'`}
                            </pre>
                          </div>
                        </div>
                      )}

                      <div className="mt-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Respostas</h4>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(ep.responses).map(([code, resp]) => (
                            <span
                              key={code}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium ${
                                code.startsWith('2')
                                  ? 'bg-green-50 text-green-800'
                                  : code.startsWith('4')
                                  ? 'bg-yellow-50 text-yellow-800'
                                  : 'bg-red-50 text-red-800'
                              }`}
                            >
                              <span className="font-bold">{code}</span>
                              <span>{resp.description}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        <section className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-bold text-neutral-900 mb-4">Estrutura dos dados</h2>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">Post</h3>
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm font-mono text-gray-300">
{`{
  "id": 1,
  "title": "Título do Post",
  "slug": "titulo-do-post",
  "content": "<p>Conteúdo HTML sanitizado</p>",
  "excerpt": "Resumo do post",
  "cover_image": "https://exemplo.com/imagem.jpg",
  "status": "published",           // "draft" | "published"
  "published_at": "2024-01-15T10:00:00Z",
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}`}
                </pre>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">Categoria</h3>
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm font-mono text-gray-300">
{`{
  "id": 1,
  "name": "Tecnologia",
  "slug": "tecnologia",
  "description": "Artigos sobre tecnologia",
  "created_at": "2024-01-15T10:00:00Z"
}`}
                </pre>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">Tag</h3>
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm font-mono text-gray-300">
{`{
  "id": 1,
  "name": "JavaScript",
  "slug": "javascript",
  "created_at": "2024-01-15T10:00:00Z"
}`}
                </pre>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-blue-900 mb-3">Download para IA</h2>
          <p className="text-sm text-blue-800 mb-4">
            Baixe o arquivo de especificação OpenAPI 3.1 em formato JSON. Este arquivo pode ser usado para configurar IAs
            (como ChatGPT, Claude, etc.) para que elas conheçam toda a estrutura da API do blog.
          </p>
          <a
            href="/api/v1/docs"
            download="openapi.json"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-brand-primary text-white hover:bg-brand-primary-dark transition-colors"
          >
            Baixar openapi.json
          </a>
        </section>

        <footer className="mt-12 pb-8 text-center text-sm text-gray-400">
          MMA Blog API v1.0 &mdash; <a href="/admin" className="hover:text-gray-600">Painel Admin</a>
        </footer>
      </div>
    </div>
  )
}
