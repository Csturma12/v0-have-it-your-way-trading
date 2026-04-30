'use client'

import { useState, type KeyboardEvent } from 'react'
import { X, Plus, Search } from 'lucide-react'

interface Props {
  tickers: string[]
  onChange: (next: string[]) => void
  max?: number
  /**
   * Color assigned to each slot index. Caller supplies so the chart can
   * use the same color per ticker.
   */
  colors: string[]
}

export function TickerInputChips({ tickers, onChange, max = 4, colors }: Props) {
  const [input, setInput] = useState('')

  const add = () => {
    const t = input.trim().toUpperCase()
    if (!t) return
    if (tickers.includes(t)) {
      setInput('')
      return
    }
    if (tickers.length >= max) return
    onChange([...tickers, t])
    setInput('')
  }

  const remove = (t: string) => {
    onChange(tickers.filter(x => x !== t))
  }

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add()
    }
    if (e.key === 'Backspace' && !input && tickers.length) {
      onChange(tickers.slice(0, -1))
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-border bg-card/50">
      {tickers.map((t, i) => (
        <div
          key={t}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md font-mono text-xs font-bold"
          style={{
            backgroundColor: `${colors[i]}22`,
            border: `1px solid ${colors[i]}66`,
            color: colors[i],
          }}
        >
          <span>{t}</span>
          <button
            onClick={() => remove(t)}
            className="opacity-60 hover:opacity-100"
            aria-label={`Remove ${t}`}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}

      {tickers.length < max && (
        <div className="flex items-center gap-1.5 flex-1 min-w-[120px]">
          <Search className="w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder={`Add ticker (Enter)`}
            maxLength={6}
            className="flex-1 bg-transparent outline-none text-xs font-mono uppercase placeholder:text-muted-foreground/60 placeholder:normal-case"
          />
          <button
            onClick={add}
            disabled={!input.trim()}
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono border border-border hover:bg-muted/50 disabled:opacity-40"
          >
            <Plus className="w-2.5 h-2.5" /> Add
          </button>
        </div>
      )}

      <div className="text-[10px] font-mono text-muted-foreground ml-auto">
        {tickers.length}/{max} tickers
      </div>
    </div>
  )
}
