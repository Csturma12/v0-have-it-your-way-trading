'use client'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts'

interface BarPoint { time: string | number; close: number }

interface TickerSeries {
  ticker: string
  bars: BarPoint[] | null
  color: string
}

interface Props {
  series: TickerSeries[]
  /** "absolute" shows raw $, "normalized" shows % change from first day */
  mode: 'absolute' | 'normalized'
}

interface MergedPoint { time: string | number; [ticker: string]: number | string }

function mergeSeries(series: TickerSeries[], mode: 'absolute' | 'normalized'): MergedPoint[] {
  // Index every series by time string for efficient merge
  const indices = series.map(s => {
    const map = new Map<string | number, number>()
    if (!s.bars) return map
    const base = s.bars[0]?.close || 1
    s.bars.forEach(b => {
      const v = mode === 'normalized' && base
        ? ((b.close - base) / base) * 100
        : b.close
      map.set(b.time, v)
    })
    return map
  })

  // Union of all time points
  const allTimes = new Set<string | number>()
  series.forEach((s, i) => {
    if (!s.bars) return
    s.bars.forEach(b => allTimes.add(b.time))
  })

  const sorted = Array.from(allTimes).sort((a, b) => {
    if (typeof a === 'number' && typeof b === 'number') return a - b
    return String(a).localeCompare(String(b))
  })

  return sorted.map(time => {
    const point: MergedPoint = { time }
    series.forEach((s, i) => {
      const v = indices[i].get(time)
      if (v !== undefined) point[s.ticker] = Number(v.toFixed(2))
    })
    return point
  })
}

function formatTimeLabel(t: string | number): string {
  if (typeof t === 'string') return t.slice(5) // "2025-04-30" -> "04-30"
  // intraday seconds
  const d = new Date(t * 1000)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function NormalizedChart({ series, mode }: Props) {
  const data = mergeSeries(series, mode)
  const validSeries = series.filter(s => s.bars && s.bars.length > 0)

  if (validSeries.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-xs font-mono text-muted-foreground border border-border rounded-lg">
        No price data available for selected tickers
      </div>
    )
  }

  return (
    <div className="h-80 w-full border border-border rounded-lg p-3 bg-card/30">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 12, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fontFamily: 'monospace', fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={formatTimeLabel}
            minTickGap={40}
          />
          <YAxis
            tick={{ fontSize: 10, fontFamily: 'monospace', fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={v => mode === 'normalized' ? `${v.toFixed(0)}%` : `$${v.toFixed(0)}`}
            width={50}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 6,
              fontSize: 11,
              fontFamily: 'monospace',
            }}
            labelFormatter={formatTimeLabel}
            formatter={(value: number) => [
              mode === 'normalized' ? `${value.toFixed(2)}%` : `$${value.toFixed(2)}`,
              '',
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, fontFamily: 'monospace' }}
            iconType="line"
          />
          {validSeries.map(s => (
            <Line
              key={s.ticker}
              type="monotone"
              dataKey={s.ticker}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
