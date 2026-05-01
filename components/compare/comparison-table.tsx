'use client'

import { ArrowUp, ArrowDown, Minus } from 'lucide-react'

interface CompareResult {
  ticker: string
  ok: boolean
  error?: string
  quote: any | null
  fundamentals: any | null
  profile: any | null
}

interface Props {
  results: CompareResult[]
  colors: string[]
}

interface Row {
  label: string
  /** higher value is better, lower is better, or no preference */
  direction: 'higher' | 'lower' | 'neutral'
  /** Per-ticker number (or null) */
  values: (number | null)[]
  /** Display formatter */
  fmt: (n: number | null) => string
}

interface Section {
  title: string
  rows: Row[]
}

function fmtCurrency(n: number | null): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return `$${n.toFixed(2)}`
}
function fmtPct(n: number | null): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
}
function fmtPctRaw(n: number | null): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return `${n.toFixed(2)}%`
}
function fmtNum(n: number | null, digits = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return n.toFixed(digits)
}
function fmtBig(n: number | null): string {
  if (n === null || n === undefined || Number.isNaN(n) || n === 0) return '—'
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(1)}M`
  return `$${n.toFixed(0)}`
}
function fmtVol(n: number | null): string {
  if (n === null || n === undefined || Number.isNaN(n) || n === 0) return '—'
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toFixed(0)
}
function fmtText(n: number | null): string {
  return '—'
}

function bestWorst(values: (number | null)[], direction: 'higher' | 'lower' | 'neutral') {
  if (direction === 'neutral') return { bestIdx: -1, worstIdx: -1 }
  const valid = values
    .map((v, i) => ({ v, i }))
    .filter(x => x.v !== null && x.v !== undefined && !Number.isNaN(x.v as number)) as { v: number; i: number }[]
  if (valid.length < 2) return { bestIdx: -1, worstIdx: -1 }

  if (direction === 'higher') {
    const best = valid.reduce((a, b) => (b.v > a.v ? b : a))
    const worst = valid.reduce((a, b) => (b.v < a.v ? b : a))
    return { bestIdx: best.i, worstIdx: worst.i }
  } else {
    const best = valid.reduce((a, b) => (b.v < a.v ? b : a))
    const worst = valid.reduce((a, b) => (b.v > a.v ? b : a))
    return { bestIdx: best.i, worstIdx: worst.i }
  }
}

function buildSections(results: CompareResult[]): Section[] {
  const q  = (i: number, key: string) => results[i].quote?.[key] ?? null
  const f  = (i: number, key: string) => results[i].fundamentals?.[key] ?? null
  const p  = (i: number, key: string) => results[i].profile?.[key] ?? null
  const idx = results.map((_, i) => i)

  return [
    {
      title: 'Quote',
      rows: [
        { label: 'Price',         direction: 'neutral', fmt: fmtCurrency, values: idx.map(i => q(i, 'price')) },
        { label: 'Day Change',    direction: 'higher',  fmt: fmtCurrency, values: idx.map(i => q(i, 'change')) },
        { label: 'Day Change %',  direction: 'higher',  fmt: fmtPct,      values: idx.map(i => q(i, 'changePercent')) },
        { label: 'Volume',        direction: 'higher',  fmt: fmtVol,      values: idx.map(i => q(i, 'volume')) },
        { label: 'Avg Volume',    direction: 'neutral', fmt: fmtVol,      values: idx.map(i => q(i, 'avgVolume')) },
      ],
    },
    {
      title: 'Valuation',
      rows: [
        { label: 'Market Cap',    direction: 'neutral', fmt: fmtBig,      values: idx.map(i => f(i, 'marketCap') ?? q(i, 'marketCap')) },
        { label: 'P/E',           direction: 'lower',   fmt: fmtNum,      values: idx.map(i => f(i, 'pe') ?? q(i, 'pe')) },
        { label: 'P/S',           direction: 'lower',   fmt: fmtNum,      values: idx.map(i => f(i, 'ps')) },
        { label: 'P/B',           direction: 'lower',   fmt: fmtNum,      values: idx.map(i => f(i, 'pb')) },
        { label: 'EPS',           direction: 'higher',  fmt: fmtCurrency, values: idx.map(i => f(i, 'eps') ?? q(i, 'eps')) },
        { label: 'Revenue',       direction: 'higher',  fmt: fmtBig,      values: idx.map(i => f(i, 'revenue')) },
      ],
    },
    {
      title: 'Profitability',
      rows: [
        { label: 'Gross Margin',     direction: 'higher', fmt: fmtPctRaw, values: idx.map(i => f(i, 'grossMargin')) },
        { label: 'Operating Margin', direction: 'higher', fmt: fmtPctRaw, values: idx.map(i => f(i, 'operatingMargin')) },
        { label: 'Net Margin',       direction: 'higher', fmt: fmtPctRaw, values: idx.map(i => f(i, 'netMargin')) },
        { label: 'ROE',              direction: 'higher', fmt: fmtPctRaw, values: idx.map(i => f(i, 'roe')) },
        { label: 'ROA',              direction: 'higher', fmt: fmtPctRaw, values: idx.map(i => f(i, 'roa')) },
      ],
    },
    {
      title: 'Performance',
      rows: [
        { label: '52W High',         direction: 'neutral', fmt: fmtCurrency, values: idx.map(i => q(i, 'high52w')) },
        { label: '52W Low',          direction: 'neutral', fmt: fmtCurrency, values: idx.map(i => q(i, 'low52w')) },
      ],
    },
    {
      title: 'Risk',
      rows: [
        { label: 'Beta',             direction: 'lower',  fmt: fmtNum,    values: idx.map(i => f(i, 'beta')) },
        { label: 'Debt/Equity',      direction: 'lower',  fmt: fmtNum,    values: idx.map(i => f(i, 'debtToEquity')) },
        { label: 'Current Ratio',    direction: 'higher', fmt: fmtNum,    values: idx.map(i => f(i, 'currentRatio')) },
      ],
    },
    {
      title: 'Company',
      rows: [
        { label: 'Sector',           direction: 'neutral', fmt: fmtText,  values: idx.map(() => null) },
        { label: 'Industry',         direction: 'neutral', fmt: fmtText,  values: idx.map(() => null) },
        { label: 'Employees',        direction: 'neutral', fmt: fmtVol,   values: idx.map(i => f(i, 'employees') ?? p(i, 'employees')) },
      ],
    },
  ]
}

// Special rendering for text-only rows (sector / industry)
function textValue(results: CompareResult[], rowLabel: string, idx: number): string {
  const f = results[idx].fundamentals
  const p = results[idx].profile
  if (rowLabel === 'Sector') return f?.sector || p?.sector || '—'
  if (rowLabel === 'Industry') return f?.industry || p?.industry || '—'
  return '—'
}

export function ComparisonTable({ results, colors }: Props) {
  if (!results.length) return null

  const sections = buildSections(results)
  const numCols = results.length

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card/30">
      {/* Header row */}
      <div
        className="grid border-b border-border bg-muted/30"
        style={{ gridTemplateColumns: `180px repeat(${numCols}, 1fr)` }}
      >
        <div className="px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
          Metric
        </div>
        {results.map((r, i) => (
          <div
            key={r.ticker}
            className="px-3 py-2 text-center border-l border-border"
          >
            <div
              className="text-xs font-mono font-bold"
              style={{ color: r.ok ? colors[i] : 'hsl(var(--muted-foreground))' }}
            >
              {r.ticker}
            </div>
            {!r.ok && (
              <div className="text-[9px] font-mono text-red-400 mt-0.5 truncate">
                {r.error}
              </div>
            )}
          </div>
        ))}
      </div>

      {sections.map(section => (
        <div key={section.title}>
          <div
            className="grid bg-muted/20 border-b border-border"
            style={{ gridTemplateColumns: `180px repeat(${numCols}, 1fr)` }}
          >
            <div className="px-3 py-1.5 text-[9px] font-mono font-bold uppercase tracking-wider text-foreground/70 col-span-full">
              {section.title}
            </div>
          </div>
          {section.rows.map(row => {
            const isTextRow = row.label === 'Sector' || row.label === 'Industry'
            const { bestIdx, worstIdx } = isTextRow
              ? { bestIdx: -1, worstIdx: -1 }
              : bestWorst(row.values, row.direction)

            return (
              <div
                key={row.label}
                className="grid border-b border-border/40 hover:bg-muted/10"
                style={{ gridTemplateColumns: `180px repeat(${numCols}, 1fr)` }}
              >
                <div className="px-3 py-1.5 text-[10px] font-mono text-muted-foreground">
                  {row.label}
                </div>
                {results.map((r, i) => {
                  const display = isTextRow
                    ? textValue(results, row.label, i)
                    : row.fmt(row.values[i])
                  const isBest  = i === bestIdx
                  const isWorst = i === worstIdx

                  return (
                    <div
                      key={i}
                      className={`px-3 py-1.5 text-[10px] font-mono text-center border-l border-border/40 flex items-center justify-center gap-1 ${
                        isBest ? 'bg-green-500/10 text-green-400 font-semibold'
                        : isWorst ? 'bg-red-500/10 text-red-400'
                        : 'text-foreground'
                      }`}
                    >
                      {isBest && <ArrowUp className="w-2.5 h-2.5" />}
                      {isWorst && <ArrowDown className="w-2.5 h-2.5" />}
                      <span>{display}</span>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
