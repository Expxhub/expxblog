'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface ModelOption {
  id: string
  name: string
}

interface Props {
  value: string
  onChange: (value: string) => void
  models: ModelOption[]
  loading: boolean
}

export function ModelCombobox({ value, onChange, models, loading }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const selected = models.find((m) => m.id === value)

  const filtered = models.filter((m) => {
    const q = search.toLowerCase()
    return m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)
  })

  const hasCustomOption = search.trim() && !filtered.some((m) => m.id === search.trim())
  const totalItems = filtered.length + (hasCustomOption ? 1 : 0)

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setOpen(false)
      setSearch('')
      setHighlightIndex(-1)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [handleClickOutside])

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  useEffect(() => {
    setHighlightIndex(-1)
  }, [search])

  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const items = listRef.current.children
      if (items[highlightIndex]) {
        items[highlightIndex].scrollIntoView({ block: 'nearest' })
      }
    }
  }, [highlightIndex])

  function handleSelect(id: string) {
    onChange(id)
    setOpen(false)
    setSearch('')
    setHighlightIndex(-1)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setOpen(true)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightIndex((prev) => Math.min(prev + 1, totalItems - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightIndex((prev) => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (highlightIndex >= 0 && filtered[highlightIndex]) {
          handleSelect(filtered[highlightIndex].id)
        } else if (search.trim()) {
          handleSelect(search.trim())
        }
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        setSearch('')
        setHighlightIndex(-1)
        break
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex items-center border border-gray-300 rounded-lg px-3 py-2 text-sm cursor-pointer hover:border-gray-400 focus-within:ring-2 focus-within:ring-brand-primary focus-within:border-brand-primary bg-white"
        onClick={() => {
          if (!open) setOpen(true)
        }}
      >
        {open ? (
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 outline-none bg-transparent text-sm"
            placeholder="Pesquisar modelo..."
          />
        ) : (
          <span className={`flex-1 truncate ${selected ? 'text-gray-900' : 'text-gray-400'}`}>
            {selected ? `${selected.name} (${selected.id})` : value || 'Selecione um modelo...'}
          </span>
        )}
        <svg
          className={`w-4 h-4 text-gray-400 shrink-0 ml-2 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {open && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg py-1"
          role="listbox"
        >
          {loading ? (
            <li className="px-3 py-2 text-sm text-gray-500">Carregando modelos...</li>
          ) : filtered.length === 0 && !search.trim() ? (
            <li className="px-3 py-2 text-sm text-gray-500">Nenhum modelo disponível</li>
          ) : (
            <>
              {search.trim() && !filtered.some((m) => m.id === search.trim()) && (
                <li
                  className={`px-3 py-2 text-sm cursor-pointer flex flex-col gap-0.5 ${
                    highlightIndex === 0 ? 'bg-gray-100' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleSelect(search.trim())}
                  onMouseEnter={() => setHighlightIndex(0)}
                >
                  <span className="font-medium truncate">Usar: {search.trim()}</span>
                  <span className="text-xs text-gray-400">Modelo personalizado</span>
                </li>
              )}
              {filtered.map((model, index) => {
                const offsetIndex = search.trim() && !filtered.some((m) => m.id === search.trim()) ? index + 1 : index
                return (
                  <li
                    key={model.id}
                    role="option"
                    aria-selected={model.id === value}
                    className={`px-3 py-2 text-sm cursor-pointer flex flex-col gap-0.5 ${
                      model.id === value
                        ? 'bg-brand-primary text-white'
                        : offsetIndex === highlightIndex
                          ? 'bg-gray-100'
                          : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleSelect(model.id)}
                    onMouseEnter={() => setHighlightIndex(offsetIndex)}
                  >
                    <span className="font-medium truncate">{model.name}</span>
                    <span className={`text-xs truncate ${model.id === value ? 'text-white/70' : 'text-gray-400'}`}>
                      {model.id}
                    </span>
                  </li>
                )
              })}
            </>
          )}
        </ul>
      )}
    </div>
  )
}
