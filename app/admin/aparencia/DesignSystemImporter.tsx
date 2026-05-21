'use client'

import { useState } from 'react'
import type { DesignSystem } from '@/lib/settings'

interface ExtractedTokens {
  custom_properties: Record<string, string>
  font_families: string[]
  colors: string[]
  border_radii: string[]
  font_sizes: string[]
  logo_candidates: string[]
  source_url: string
}

// Resolve var(--name) references one level deep
function resolveVarRef(value: string, props: Record<string, string>): string {
  const varMatch = /^var\((--[\w-]+)\)$/.exec(value.trim())
  if (varMatch) return props[varMatch[1]]?.trim() ?? value
  return value.trim()
}

function parsePx(v: string): number {
  if (v.endsWith('px')) return parseFloat(v)
  if (v.endsWith('rem')) return parseFloat(v) * 16
  if (v.endsWith('em')) return parseFloat(v) * 16
  return NaN
}

function mapTokensToDS(
  props: Record<string, string>,
  fontFamilies: string[],
  colors: string[],
  borderRadii: string[],
  fontSizes: string[],
): Partial<DesignSystem> {
  const mapped: Partial<DesignSystem> = {}
  const set = (key: keyof DesignSystem, val: string) => {
    if (val) (mapped as Record<string, string>)[key] = val
  }

  // ── Fonts ──────────────────────────────────────────────────────────────
  // 1. Look for vars with "body"/"sans"/"text" in name → font_sans
  // 2. Look for vars with "display"/"heading"/"serif"/"title" → font_serif
  // 3. Look for vars with "mono"/"code" → font_mono
  // 4. Fall back to font-family declarations from CSS
  const fontVars = Object.entries(props).filter(([k]) => /font/i.test(k))

  const bodyVar = fontVars.find(([k]) => /body|sans|text|base/i.test(k))
  const headingVar = fontVars.find(([k]) => /display|heading|serif|title|hero/i.test(k))
  const monoVar = fontVars.find(([k]) => /mono|code/i.test(k))

  if (bodyVar) set('font_sans', resolveVarRef(bodyVar[1], props))
  else if (fontFamilies[0]) set('font_sans', resolveVarRef(fontFamilies[0], props))

  if (headingVar) set('font_serif', resolveVarRef(headingVar[1], props))
  else if (fontFamilies[1]) set('font_serif', resolveVarRef(fontFamilies[1], props))

  if (monoVar) set('font_mono', resolveVarRef(monoVar[1], props))

  // ── Font sizes ─────────────────────────────────────────────────────────
  // Try named vars first, then fall back to sorted font-size list
  const sizeKeys: [RegExp, keyof DesignSystem][] = [
    [/font-size-sm|size-sm|text-sm/i, 'font_size_sm'],
    [/font-size-base|size-base|size-md|text-base/i, 'font_size_base'],
    [/font-size-lg|size-lg|text-lg/i, 'font_size_lg'],
    [/font-size-xl|size-xl|text-xl/i, 'font_size_xl'],
    [/font-size-2xl|size-2xl|text-2xl/i, 'font_size_2xl'],
    [/font-size-3xl|size-3xl|text-3xl/i, 'font_size_3xl'],
  ]
  for (const [pattern, dsKey] of sizeKeys) {
    const found = Object.entries(props).find(([k]) => pattern.test(k))
    if (found) set(dsKey, resolveVarRef(found[1], props))
  }

  // Fill remaining from sorted font-sizes
  const sortedSizes = [...fontSizes]
    .map(v => ({ v, px: parsePx(v) }))
    .filter(x => !isNaN(x.px))
    .sort((a, b) => a.px - b.px)
    .map(x => x.v)

  const sizeSlots: (keyof DesignSystem)[] = ['font_size_sm', 'font_size_base', 'font_size_lg', 'font_size_xl', 'font_size_2xl', 'font_size_3xl']
  if (sortedSizes.length >= 3) {
    // pick 6 evenly spaced entries from the sorted list
    const step = Math.max(1, Math.floor(sortedSizes.length / 6))
    sizeSlots.forEach((slot, i) => {
      if (!mapped[slot]) {
        const candidate = sortedSizes[Math.min(i * step, sortedSizes.length - 1)]
        if (candidate) set(slot, candidate)
      }
    })
  }

  // ── Border radii ───────────────────────────────────────────────────────
  const radiusKeys: [RegExp, keyof DesignSystem][] = [
    [/radius-sm|rounded-sm/i, 'radius_sm'],
    [/radius-md|radius-base|rounded-md/i, 'radius_md'],
    [/radius-lg|rounded-lg/i, 'radius_lg'],
    [/radius-full|radius-pill|rounded-full/i, 'radius_full'],
  ]
  for (const [pattern, dsKey] of radiusKeys) {
    const found = Object.entries(props).find(([k]) => pattern.test(k))
    if (found) set(dsKey, resolveVarRef(found[1], props))
  }

  // Fill from sorted border-radius values
  const sortedRadii = [...borderRadii]
    .filter(v => /^\d+(\.\d+)?(px|rem|em|%)$/.test(v))
    .map(v => ({ v, px: parsePx(v.endsWith('%') ? '0px' : v) }))
    .filter(x => !isNaN(x.px))
    .sort((a, b) => a.px - b.px)
    .map(x => x.v)

  const radiiSlots: [keyof DesignSystem, number][] = [
    ['radius_sm', 0], ['radius_md', 1], ['radius_lg', 2],
  ]
  for (const [slot, idx] of radiiSlots) {
    if (!mapped[slot] && sortedRadii[idx]) set(slot, sortedRadii[idx])
  }
  // radius_full: prefer "50%" or highest px value
  if (!mapped.radius_full) {
    const full = borderRadii.find(v => v === '50%' || v === '9999px' || v === '100px' || /^[5-9]\d{2,}px/.test(v))
    if (full) set('radius_full', full)
    else if (sortedRadii.at(-1)) set('radius_full', sortedRadii.at(-1)!)
  }

  // ── Colors ─────────────────────────────────────────────────────────────
  // Named var heuristics
  const colorEntries = Object.entries(props).filter(([, v]) => /^#[0-9A-Fa-f]{3,6}$/.test(v.trim()))

  const find = (pattern: RegExp) => colorEntries.find(([k]) => pattern.test(k))?.[1].trim()

  const textPrimary = find(/text-primary|color-text$|foreground|fg$|body-color/i)
    ?? find(/white|light/i)
  const textSecondary = find(/text-secondary|text-muted|gray-[123]\d\d|muted/i)
  const borderColor = find(/border|divider|separator/i)
  const errorColor = find(/error|danger|red/i)
  const successColor = find(/success|green/i)
  const warningColor = find(/warning|yellow|gold|orange/i)

  if (textPrimary) set('color_text_primary', textPrimary)
  if (textSecondary) set('color_text_secondary', textSecondary)
  if (borderColor) set('color_border', borderColor)
  if (errorColor) set('color_error', errorColor)
  if (successColor) set('color_success', successColor)
  if (warningColor) set('color_warning', warningColor)

  return mapped
}

interface Props {
  onApply: (tokens: Partial<DesignSystem>) => void
  onLogoApply?: (url: string) => void
}

export function DesignSystemImporter({ onApply, onLogoApply }: Props) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [extracted, setExtracted] = useState<ExtractedTokens | null>(null)
  const [mapped, setMapped] = useState<Partial<DesignSystem> | null>(null)
  const [logoLoading, setLogoLoading] = useState<string | null>(null)
  const [logoError, setLogoError] = useState<string | null>(null)

  async function handleExtract() {
    setLoading(true)
    setError(null)
    setExtracted(null)
    setMapped(null)
    try {
      const res = await fetch('/api/admin/design-system/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const contentType = res.headers.get('content-type') ?? ''
      if (!contentType.includes('application/json')) {
        throw new Error(`Resposta inesperada do servidor (status ${res.status})`)
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro desconhecido')
      setExtracted(data as ExtractedTokens)
      const tokens = mapTokensToDS(
        data.custom_properties,
        data.font_families,
        data.colors,
        data.border_radii,
        data.font_sizes,
      )
      setMapped(tokens)
      if (Object.keys(tokens).length > 0) {
        onApply(tokens)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao extrair')
    } finally {
      setLoading(false)
    }
  }

  function handleApply() {
    if (mapped) onApply(mapped)
  }

  async function handleFetchLogo(logoUrl: string) {
    setLogoLoading(logoUrl)
    setLogoError(null)
    try {
      const res = await fetch('/api/admin/design-system/fetch-logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: logoUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao importar logo')
      onLogoApply?.(data.url)
    } catch (e) {
      setLogoError(e instanceof Error ? e.message : 'Erro ao importar logo')
    } finally {
      setLogoLoading(null)
    }
  }

  const mappedCount = mapped ? Object.keys(mapped).length : 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-neutral-900 mb-1">Importar do site da empresa</h3>
      <p className="text-xs text-gray-500 mb-4">
        Cole a URL do site da sua empresa. O sistema vai ler o CSS, extrair as cores, fontes e tokens
        e pré-preencher as configurações abaixo para você confirmar.
      </p>

      <div className="flex gap-2 mb-4">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://suaempresa.com.br"
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary"
          onKeyDown={(e) => e.key === 'Enter' && !loading && url && handleExtract()}
        />
        <button
          onClick={handleExtract}
          disabled={loading || !url}
          className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity whitespace-nowrap"
        >
          {loading ? 'Lendo CSS...' : 'Extrair Design'}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {extracted && (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-600 space-y-2">
            <p className="font-semibold text-gray-700">Tokens encontrados em {extracted.source_url}</p>

            {extracted.font_families.length > 0 && (
              <div>
                <span className="font-medium">Fontes: </span>
                <span>{extracted.font_families.slice(0, 5).join(', ')}</span>
              </div>
            )}

            {extracted.colors.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                <span className="font-medium">Cores: </span>
                {extracted.colors.slice(0, 12).map((c) => (
                  <span
                    key={c}
                    className="inline-block w-5 h-5 rounded border border-gray-200"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            )}

            {extracted.border_radii.length > 0 && (
              <div>
                <span className="font-medium">Border radius: </span>
                <span>{extracted.border_radii.slice(0, 5).join(', ')}</span>
              </div>
            )}

            {Object.keys(extracted.custom_properties).length > 0 && (
              <div>
                <span className="font-medium">CSS vars encontradas: </span>
                <span>{Object.keys(extracted.custom_properties).length}</span>
              </div>
            )}
          </div>

          {extracted.logo_candidates.length > 0 && onLogoApply && (
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2">Logotipos encontrados</p>
              {logoError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-2">
                  {logoError}
                </p>
              )}
              <div className="flex flex-wrap gap-3">
                {extracted.logo_candidates.map((logoUrl) => (
                  <div key={logoUrl} className="flex flex-col items-center gap-1.5">
                    <div className="w-24 h-16 border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden p-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={logoUrl}
                        alt="logo candidato"
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    </div>
                    <button
                      onClick={() => handleFetchLogo(logoUrl)}
                      disabled={logoLoading === logoUrl}
                      className="text-xs text-brand-primary font-medium hover:underline disabled:opacity-50"
                    >
                      {logoLoading === logoUrl ? 'Importando...' : 'Usar este logo'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {mappedCount > 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-xs">
              <p className="font-semibold text-green-800 mb-2">
                ✓ {mappedCount} token{mappedCount > 1 ? 's' : ''} aplicado{mappedCount > 1 ? 's' : ''} automaticamente
              </p>
              <ul className="space-y-1 text-green-700 columns-2">
                {Object.entries(mapped!).map(([k, v]) => (
                  <li key={k} className="truncate">
                    <span className="font-mono">{k}</span>: <span>{v}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={handleApply}
                className="mt-3 text-green-700 underline text-xs hover:text-green-900"
              >
                Re-aplicar tokens
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Nenhum token foi mapeado automaticamente. Configure os campos manualmente abaixo.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
