# Bug: Geração de imagem sem log de IA

**Data**: 2026-06-03
**Severidade**: ALTO
**Status**: RESOLVIDO

## Descrição do problema

Chamadas de geração de imagem ao OpenRouter não eram registradas na tabela `aiRequestLogs`.
Além disso, 12 chamadas a `callOpenRouter()` em agentes de texto não passavam o parâmetro
`feature`, fazendo com que fossem gravadas como `feature='unknown'` — impossibilitando
filtragem por agente no dashboard de KPI de IA.

## Causa-raiz

**Arquivo**: `lib/ai.ts`
**Linha**: 284 (função `callOpenRouterImage`)
**Tipo**: Lógica — omissão de instrumentação

`callOpenRouterImage()` foi implementada como função separada de `callOpenRouter()`, mas sem
replicar a chamada a `persistAiLog()` que existe em `callOpenRouter()`. O resultado é que 100%
das gerações de imagem eram invisíveis ao sistema de logging. Adicionalmente, os agentes do
pipeline usavam `callOpenRouter()` diretamente sem passar `feature`, resultando em registros
genéricos sem identificação de agente.

## Solução aplicada

**`lib/ai.ts` — `callOpenRouterImage()`**:
- Adicionado `persistAiLog()` fire-and-forget em todos os caminhos de erro (dentro do loop de retry e no bloco pós-loop)
- Adicionado `persistAiLog()` no caminho de sucesso com `feature: 'image_generation'`
- `startedAt` capturado por tentativa (não global) para que `duration_ms` reflita apenas a tentativa que falhou, sem inflar com os sleeps dos retries anteriores
- `total_tokens` usa fallback `promptTokens + completionTokens` (alinhado com `callOpenRouter`)

**Arquivos de agentes — `feature` adicionada**:
- `lib/agents/headline.ts` — `feature: 'content_generation'` (2 chamadas)
- `lib/agents/researcher.ts` — `feature: 'content_generation'` (2 chamadas)
- `lib/agents/analyst.ts` — `feature: 'content_generation'` (2 chamadas)
- `lib/agents/copywriter.ts` — `feature: 'content_generation'` (2 chamadas)
- `lib/agents/reviewer.ts` — `feature: 'content_generation'` (1 chamada)
- `lib/agents/cta.ts` — `feature: 'content_generation'` (1 chamada)
- `lib/agents/designer.ts` — substituída chamada `callOpenRouter` por `aiChat('prompt_generation', ...)` que já tem logging interno correto

## Como reproduzir (antes da correção)

1. Configurar modelo de imagem em Admin → Configurações → IA
2. Gerar um artigo pelo pipeline com fonte de imagem = IA
3. Verificar tabela `aiRequestLogs` — nenhum registro com `feature = 'image_generation'` aparecia
4. Verificar dashboard de IA — custo de geração de imagem era zero / invisível

## Como verificar (após a correção)

- [ ] Gerar um post pelo pipeline com imagem via IA e verificar entrada com `feature='image_generation'` em `aiRequestLogs`
- [ ] Gerar imagem via bot do Telegram e verificar log correspondente
- [ ] Verificar que logs de agentes de texto têm `feature` específica (não `'unknown'`)
- [ ] `npm run build` passa sem erros TypeScript

## Lições aprendidas

Funções que fazem chamadas HTTP a APIs externas devem ser auditadas para instrumentação de
logging quando criadas. O padrão correto é: toda função que encapsula uma chamada ao OpenRouter
deve chamar `persistAiLog()` em todos os caminhos (sucesso e erro). A função `callOpenRouter()`
serve como referência canônica — qualquer nova função de chamada à API deve replicar seu
padrão de instrumentação. Ao criar um wrapper especializado (como `callOpenRouterImage`),
é fácil esquecer de replicar a instrumentação — prefira reusar `callOpenRouter` internamente
quando possível, ou adicionar logging como checklist obrigatório na criação de novas funções.
