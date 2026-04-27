'use client'

/**
 * TradingViewAdvancedChart
 *
 * Embeds the real TradingView Advanced Chart widget via their official
 * script embed approach. Supports symbol change, theme, and auto-resizing.
 * All indicators, drawing tools, timeframes, etc. are built into the widget.
 */
import { useEffect, useRef, useCallback } from 'react'

interface TradingViewAdvancedChartProps {
  ticker: string
  onChangeTicker?: (ticker: string) => void
}

// Map plain ticker to TradingView exchange:symbol format
function toTVSymbol(ticker: string): string {
  const upper = ticker.toUpperCase().trim()
  // If already has exchange prefix (e.g. "NASDAQ:AAPL") pass through
  if (upper.includes(':')) return upper
  // Common crypto
  const crypto: Record<string, string> = {
    BTC: 'BINANCE:BTCUSDT', ETH: 'BINANCE:ETHUSDT',
    SOL: 'BINANCE:SOLUSDT', DOGE: 'BINANCE:DOGEUSDT',
  }
  if (crypto[upper]) return crypto[upper]
  return upper
}

export function TradingViewAdvancedChart({ ticker, onChangeTicker }: TradingViewAdvancedChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<unknown>(null)

  const buildWidget = useCallback(() => {
    if (!containerRef.current) return

    // Clear previous widget
    containerRef.current.innerHTML = ''

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: toTVSymbol(ticker),
      interval: 'D',
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',           // Candlestick
      locale: 'en',
      backgroundColor: '#0a0a0a',
      gridColor: 'rgba(255,255,255,0.04)',
      hide_top_toolbar: false,
      hide_legend: false,
      allow_symbol_change: true,
      save_image: true,
      calendar: false,
      hide_volume: false,
      support_host: 'https://www.tradingview.com',
      studies: [],
      show_popup_button: false,
      withdateranges: true,
    })

    containerRef.current.appendChild(script)
  }, [ticker])

  useEffect(() => {
    buildWidget()
    return () => {
      if (containerRef.current) containerRef.current.innerHTML = ''
    }
  }, [buildWidget])

  return (
    <div className="tradingview-widget-container h-full w-full" ref={containerRef}>
      <div className="tradingview-widget-container__widget h-full w-full" />
    </div>
  )
}
