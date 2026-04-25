'use client'

import { useEffect, useRef, useState } from 'react'
import { TrendingUp, Maximize2 } from 'lucide-react'

interface TradingViewChartProps {
  ticker: string
}

const INTERVALS = [
  { label: '1m', value: '1' },
  { label: '5m', value: '5' },
  { label: '15m', value: '15' },
  { label: '1H', value: '60' },
  { label: '4H', value: '240' },
  { label: '1D', value: 'D' },
  { label: '1W', value: 'W' },
]

export function TradingViewChart({ ticker }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [interval, setInterval] = useState('D')

  useEffect(() => {
    if (!containerRef.current) return

    containerRef.current.innerHTML = ''

    const widgetContainer = document.createElement('div')
    widgetContainer.className = 'tradingview-widget-container__widget'
    widgetContainer.style.height = '100%'
    widgetContainer.style.width = '100%'
    containerRef.current.appendChild(widgetContainer)

    const script = document.createElement('script')
    script.src =
      'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: ticker,
      interval,
      timezone: 'America/New_York',
      theme: 'dark',
      style: '1',
      locale: 'en',
      toolbar_bg: '#0a0a0a',
      enable_publishing: false,
      hide_top_toolbar: false,
      hide_legend: false,
      hide_side_toolbar: false,
      allow_symbol_change: true,
      save_image: false,
      backgroundColor: 'rgba(10, 10, 10, 1)',
      gridColor: 'rgba(34, 34, 34, 0.5)',
      studies: ['STD;EMA', 'STD;RSI', 'STD;Volume'],
      support_host: 'https://www.tradingview.com',
    })

    containerRef.current.appendChild(script)

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [ticker, interval])

  const toggleFullscreen = () => {
    if (!wrapperRef.current) return
    if (document.fullscreenElement !== wrapperRef.current) {
      wrapperRef.current.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
  }

  return (
    <div ref={wrapperRef} className="flex flex-col h-full bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-4 h-4 text-theme-green" />
          <span className="font-mono font-bold text-sm tracking-wider">{ticker}</span>
          <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
            Live Chart
          </span>
        </div>

        <div className="flex items-center gap-1">
          {INTERVALS.map((iv) => (
            <button
              key={iv.value}
              onClick={() => setInterval(iv.value)}
              className={`px-2 py-1 text-[10px] font-mono font-semibold rounded transition-colors ${
                interval === iv.value
                  ? 'bg-theme-green/20 text-theme-green border border-theme-green/40'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent'
              }`}
            >
              {iv.label}
            </button>
          ))}
          <div className="w-px h-4 bg-border mx-2" />
          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded"
            title="Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Chart container - absolute positioning ensures it fills properly */}
      <div className="flex-1 min-h-0 relative tradingview-widget-container">
        <div ref={containerRef} className="absolute inset-0" />
      </div>
    </div>
  )
}
