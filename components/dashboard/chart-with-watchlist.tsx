'use client'

/**
 * ChartWithWatchlist
 *
 * Combines the TradingView Advanced Chart with the Watchlist Panel
 * in a single widget. The watchlist sits on the right side and is
 * independently scrollable. A drag handle allows resizing the split.
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import { ChevronRight, ChevronLeft, GripVertical } from 'lucide-react'
import { TradingViewAdvancedChart } from './tradingview-advanced-chart'
import { WatchlistPanel } from './watchlist-panel'

interface ChartWithWatchlistProps {
  ticker: string
  onChangeTicker?: (ticker: string) => void
}

export function ChartWithWatchlist({ ticker, onChangeTicker }: ChartWithWatchlistProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [watchlistWidth, setWatchlistWidth] = useState(280) // default width in px
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartX = useRef(0)
  const dragStartWidth = useRef(0)

  const MIN_WIDTH = 200
  const MAX_WIDTH = 450

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    dragStartX.current = e.clientX
    dragStartWidth.current = watchlistWidth
  }, [watchlistWidth])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return
    // Moving left increases watchlist width (dragging the divider left)
    const delta = dragStartX.current - e.clientX
    const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, dragStartWidth.current + delta))
    setWatchlistWidth(newWidth)
  }, [isDragging])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    } else {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const handleSelectTicker = useCallback((t: string) => {
    onChangeTicker?.(t)
  }, [onChangeTicker])

  return (
    <div ref={containerRef} className="h-full w-full flex overflow-hidden bg-background">
      {/* Chart area - takes remaining space */}
      <div className="flex-1 min-w-0 h-full relative">
        <TradingViewAdvancedChart ticker={ticker} onChangeTicker={onChangeTicker} />
      </div>

      {/* Collapse/Expand toggle button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex-shrink-0 w-5 h-full flex items-center justify-center bg-muted/30 hover:bg-muted/50 border-l border-r border-border/50 transition-colors"
        title={isCollapsed ? 'Show Watchlist' : 'Hide Watchlist'}
      >
        {isCollapsed ? (
          <ChevronLeft className="w-3 h-3 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
        )}
      </button>

      {/* Watchlist panel - right side */}
      {!isCollapsed && (
        <>
          {/* Drag handle for resizing */}
          <div
            onMouseDown={handleMouseDown}
            className={`flex-shrink-0 w-1.5 h-full flex items-center justify-center cursor-col-resize hover:bg-primary/20 transition-colors ${
              isDragging ? 'bg-primary/30' : 'bg-transparent'
            }`}
            title="Drag to resize"
          >
            <GripVertical className="w-2.5 h-2.5 text-muted-foreground/50" />
          </div>

          {/* Watchlist content */}
          <div
            className="flex-shrink-0 h-full border-l border-border/50 overflow-hidden"
            style={{ width: watchlistWidth }}
          >
            <WatchlistPanel
              onSelectTicker={handleSelectTicker}
              selectedTicker={ticker}
            />
          </div>
        </>
      )}
    </div>
  )
}
