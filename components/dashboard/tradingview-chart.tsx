'use client'

import { useEffect, useRef } from 'react'

interface TradingViewChartProps {
  ticker: string
}

export function TradingViewChart({ ticker }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Clear previous widget
    containerRef.current.innerHTML = ''

    // Create TradingView widget
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: ticker,
      interval: 'D',
      timezone: 'America/New_York',
      theme: 'dark',
      style: '1',
      locale: 'en',
      backgroundColor: 'rgba(10, 10, 10, 1)',
      gridColor: 'rgba(34, 34, 34, 0.6)',
      hide_top_toolbar: false,
      hide_legend: false,
      allow_symbol_change: true,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: 'https://www.tradingview.com',
      studies: [
        'MASimple@tv-basicstudies',
        'RSI@tv-basicstudies',
        'MACD@tv-basicstudies',
      ],
    })

    const widgetContainer = document.createElement('div')
    widgetContainer.className = 'tradingview-widget-container__widget'
    widgetContainer.style.height = '100%'
    widgetContainer.style.width = '100%'

    containerRef.current.appendChild(widgetContainer)
    widgetContainer.appendChild(script)

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [ticker])

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Chart Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold font-mono text-primary">{ticker}</span>
          <span className="text-xs font-mono text-muted-foreground">TradingView Chart</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <span className="px-2 py-0.5 rounded bg-muted/50 border border-border/50">1D</span>
          <span className="px-2 py-0.5 rounded hover:bg-muted/50 cursor-pointer">1W</span>
          <span className="px-2 py-0.5 rounded hover:bg-muted/50 cursor-pointer">1M</span>
          <span className="px-2 py-0.5 rounded hover:bg-muted/50 cursor-pointer">3M</span>
          <span className="px-2 py-0.5 rounded hover:bg-muted/50 cursor-pointer">1Y</span>
        </div>
      </div>

      {/* TradingView Widget Container */}
      <div ref={containerRef} className="flex-1 tradingview-widget-container" />
    </div>
  )
}
