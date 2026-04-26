'use client'

import { useState, useEffect, useMemo } from 'react'
import GridLayout, { type Layout } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { Lock, Unlock, RotateCcw, Plus, X, GripVertical } from 'lucide-react'
import { SectorPillBox } from './sector-pill-box'
import { ThemesColumn } from './themes-column'
import { TradingViewChart } from './tradingview-chart'
import { WatchlistPanel } from './watchlist-panel'

const STORAGE_KEY = 'trading-dashboard-rgl-v5'

const ALL_RESIZE_HANDLES: Array<'s' | 'w' | 'e' | 'n' | 'sw' | 'nw' | 'se' | 'ne'> = [
  's', 'w', 'e', 'n', 'sw', 'nw', 'se', 'ne',
]

// ─── Sector ticker data ─────────────────────────────────────────────────────

const SECTOR_DATA = {
  'sector-ai': {
    title: 'AI & Technology',
    accent: 'green' as const,
    tickers: [
      { symbol: 'NVDA', price: 924.73, change: 4.21, signal: 'BUY' as const, conviction: 0.94, trending: 1 },
      { symbol: 'META', price: 514.82, change: 2.87, signal: 'BUY' as const, conviction: 0.89, trending: 2 },
      { symbol: 'MSFT', price: 415.30, change: 1.54, signal: 'BUY' as const, conviction: 0.86, trending: 3 },
      { symbol: 'GOOGL', price: 175.20, change: 0.93, signal: 'BUY' as const, conviction: 0.82, trending: 4 },
      { symbol: 'AMD',   price: 162.45, change: 3.14, signal: 'BUY' as const, conviction: 0.80, trending: 5 },
      { symbol: 'AMZN', price: 189.34, change: 1.22, signal: 'BUY' as const, conviction: 0.78, trending: 6 },
      { symbol: 'CRM',  price: 282.10, change: -0.44, signal: 'HOLD' as const, conviction: 0.65, trending: 7 },
      { symbol: 'ORCL', price: 124.55, change: -0.91, signal: 'SELL' as const, conviction: 0.60, trending: 8 },
    ],
  },
  'sector-banking': {
    title: 'Banking & Finance',
    accent: 'gold' as const,
    tickers: [
      { symbol: 'JPM',   price: 213.40, change: 2.10, signal: 'BUY' as const,  conviction: 0.91, trending: 1 },
      { symbol: 'GS',    price: 472.15, change: 1.85, signal: 'BUY' as const,  conviction: 0.87, trending: 2 },
      { symbol: 'MS',    price: 102.80, change: 1.40, signal: 'BUY' as const,  conviction: 0.84, trending: 3 },
      { symbol: 'BAC',   price: 38.92,  change: 0.75, signal: 'BUY' as const,  conviction: 0.79, trending: 4 },
      { symbol: 'AXP',   price: 229.60, change: -0.55, signal: 'SELL' as const, conviction: 0.74, trending: 5 },
      { symbol: 'WFC',   price: 57.34,  change: 0.28, signal: 'HOLD' as const, conviction: 0.68, trending: 6 },
      { symbol: 'C',     price: 64.10,  change: -0.32, signal: 'HOLD' as const, conviction: 0.62, trending: 7 },
      { symbol: 'BRK.B', price: 412.20, change: 0.45, signal: 'BUY' as const,  conviction: 0.77, trending: 8 },
    ],
  },
  'sector-energy': {
    title: 'Energy & Industrials',
    accent: 'red' as const,
    tickers: [
      { symbol: 'XOM', price: 112.40, change: 2.44, signal: 'BUY' as const,  conviction: 0.88, trending: 1 },
      { symbol: 'SLB', price: 43.20,  change: 3.10, signal: 'BUY' as const,  conviction: 0.85, trending: 2 },
      { symbol: 'CVX', price: 154.30, change: 1.67, signal: 'BUY' as const,  conviction: 0.81, trending: 3 },
      { symbol: 'COP', price: 122.80, change: 1.12, signal: 'BUY' as const,  conviction: 0.78, trending: 4 },
      { symbol: 'HAL', price: 34.55,  change: 0.83, signal: 'HOLD' as const, conviction: 0.71, trending: 5 },
      { symbol: 'OXY', price: 59.40,  change: -1.20, signal: 'SELL' as const, conviction: 0.72, trending: 6 },
      { symbol: 'PSX', price: 143.20, change: 0.55, signal: 'HOLD' as const, conviction: 0.64, trending: 7 },
      { symbol: 'VLO', price: 135.10, change: -0.38, signal: 'SELL' as const, conviction: 0.60, trending: 8 },
    ],
  },
  'sector-healthcare': {
    title: 'Healthcare & BioPharma',
    accent: 'cyan' as const,
    tickers: [
      { symbol: 'LLY',  price: 804.20, change: 3.54, signal: 'BUY' as const,  conviction: 0.96, trending: 1 },
      { symbol: 'NVO',  price: 122.40, change: 2.90, signal: 'BUY' as const,  conviction: 0.93, trending: 2 },
      { symbol: 'ABBV', price: 175.60, change: 1.72, signal: 'BUY' as const,  conviction: 0.88, trending: 3 },
      { symbol: 'MRK',  price: 128.30, change: 0.88, signal: 'BUY' as const,  conviction: 0.82, trending: 4 },
      { symbol: 'AMGN', price: 282.10, change: 0.42, signal: 'HOLD' as const, conviction: 0.70, trending: 5 },
      { symbol: 'JNJ',  price: 152.40, change: -0.22, signal: 'HOLD' as const, conviction: 0.66, trending: 6 },
      { symbol: 'BMY',  price: 52.80,  change: -0.94, signal: 'SELL' as const, conviction: 0.63, trending: 7 },
      { symbol: 'PFE',  price: 26.10,  change: -1.44, signal: 'SELL' as const, conviction: 0.68, trending: 8 },
    ],
  },
  'sector-consumer': {
    title: 'Consumer & Retail',
    accent: 'green' as const,
    tickers: [
      { symbol: 'COST', price: 882.40, change: 2.24, signal: 'BUY' as const,  conviction: 0.90, trending: 1 },
      { symbol: 'WMT',  price: 68.20,  change: 1.55, signal: 'BUY' as const,  conviction: 0.86, trending: 2 },
      { symbol: 'AMZN', price: 189.34, change: 1.22, signal: 'BUY' as const,  conviction: 0.83, trending: 3 },
      { symbol: 'HD',   price: 344.10, change: 0.72, signal: 'BUY' as const,  conviction: 0.79, trending: 4 },
      { symbol: 'MCD',  price: 278.50, change: 0.34, signal: 'HOLD' as const, conviction: 0.68, trending: 5 },
      { symbol: 'SBUX', price: 78.30,  change: -0.88, signal: 'SELL' as const, conviction: 0.71, trending: 6 },
      { symbol: 'NKE',  price: 85.20,  change: -1.10, signal: 'SELL' as const, conviction: 0.67, trending: 7 },
      { symbol: 'TGT',  price: 142.60, change: -1.55, signal: 'SELL' as const, conviction: 0.70, trending: 8 },
    ],
  },
  'sector-semis': {
    title: 'Semiconductors',
    accent: 'gold' as const,
    tickers: [
      { symbol: 'NVDA', price: 924.73, change: 4.21, signal: 'BUY' as const,  conviction: 0.94, trending: 1 },
      { symbol: 'AVGO', price: 1422.10, change: 3.20, signal: 'BUY' as const, conviction: 0.92, trending: 2 },
      { symbol: 'AMD',  price: 162.45, change: 3.14, signal: 'BUY' as const,  conviction: 0.88, trending: 3 },
      { symbol: 'MU',   price: 128.40, change: 2.44, signal: 'BUY' as const,  conviction: 0.86, trending: 4 },
      { symbol: 'AMAT', price: 202.30, change: 1.32, signal: 'BUY' as const,  conviction: 0.80, trending: 5 },
      { symbol: 'KLAC', price: 762.50, change: 0.94, signal: 'HOLD' as const, conviction: 0.72, trending: 6 },
      { symbol: 'QCOM', price: 174.20, change: -0.65, signal: 'HOLD' as const, conviction: 0.66, trending: 7 },
      { symbol: 'INTC', price: 31.40,  change: -2.10, signal: 'SELL' as const, conviction: 0.75, trending: 8 },
    ],
  },
}

// ─── Right-side grid widgets ─────────────────────────────────────────────────

type RightWidgetType = 'chart' | 'watchlist' | 'themes'

interface RightWidget {
  id: string
  type: RightWidgetType
  title: string
}

const DEFAULT_RIGHT_WIDGETS: RightWidget[] = [
  { id: 'chart',     type: 'chart',     title: 'Chart' },
  { id: 'watchlist', type: 'watchlist', title: 'Watchlist' },
  { id: 'themes',    type: 'themes',    title: 'Themes' },
]

const DEFAULT_LAYOUT: Layout[] = [
  { i: 'chart',     x: 0, y: 0,  w: 8, h: 14 },
  { i: 'watchlist', x: 8, y: 0,  w: 4, h: 14 },
  { i: 'themes',    x: 0, y: 14, w: 12, h: 10 },
]

interface SavedState {
  layout: Layout[]
  rightWidgets: RightWidget[]
}

interface WidgetGridProps {
  selectedTicker: string
  onSelectTicker: (t: string) => void
}

export function WidgetGrid({ selectedTicker, onSelectTicker }: WidgetGridProps) {
  const [layout, setLayout] = useState<Layout[]>(DEFAULT_LAYOUT)
  const [rightWidgets, setRightWidgets] = useState<RightWidget[]>(DEFAULT_RIGHT_WIDGETS)
  const [isEditMode, setIsEditMode] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as SavedState
        if (parsed.layout && parsed.rightWidgets) {
          setLayout(parsed.layout)
          setRightWidgets(parsed.rightWidgets)
        }
      }
    } catch { /* ignore */ }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ layout, rightWidgets } satisfies SavedState))
    } catch { /* ignore */ }
  }, [layout, rightWidgets, hydrated])

  const removeWidget = (id: string) => {
    setRightWidgets(w => w.filter(x => x.id !== id))
    setLayout(l => l.filter(x => x.i !== id))
  }

  const resetLayout = () => {
    setLayout(DEFAULT_LAYOUT)
    setRightWidgets(DEFAULT_RIGHT_WIDGETS)
  }

  const availableToAdd = useMemo(
    () => DEFAULT_RIGHT_WIDGETS.filter(d => !rightWidgets.find(w => w.id === d.id)),
    [rightWidgets]
  )

  const addWidget = (meta: RightWidget) => {
    const def = DEFAULT_LAYOUT.find(l => l.i === meta.id) ?? {
      i: meta.id, x: 0, y: Infinity, w: 6, h: 8,
    }
    setRightWidgets(w => [...w, meta])
    setLayout(l => [...l, def])
    setShowAddMenu(false)
  }

  const visibleLayout = useMemo(
    () => layout.filter(l => rightWidgets.some(w => w.id === l.i)),
    [layout, rightWidgets]
  )

  const renderRight = (widget: RightWidget) => {
    if (widget.type === 'chart')     return <TradingViewChart ticker={selectedTicker} />
    if (widget.type === 'watchlist') return <WatchlistPanel onSelectTicker={onSelectTicker} selectedTicker={selectedTicker} />
    if (widget.type === 'themes')    return <ThemesColumn onSelectTicker={onSelectTicker} />
    return null
  }

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── LEFT SIDEBAR: all sector pill boxes, scrollable ── */}
      <aside className="w-[220px] flex-shrink-0 border-r border-border overflow-y-auto bg-card/20">
        <div className="p-1.5 space-y-1">
          {Object.entries(SECTOR_DATA).map(([key, sector]) => (
            <SectorPillBox
              key={key}
              title={sector.title}
              accent={sector.accent}
              tickers={sector.tickers}
              onSelectTicker={onSelectTicker}
            />
          ))}
        </div>
      </aside>

      {/* ── RIGHT AREA: toolbar + draggable/resizable grid ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center gap-3 px-3 py-1.5 border-b border-border bg-card/30 flex-shrink-0">
          <button
            onClick={() => setIsEditMode(v => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wider uppercase transition-colors border ${
              isEditMode
                ? 'bg-green-500/20 text-green-400 border-green-500/40'
                : 'bg-muted/50 text-muted-foreground border-border hover:text-foreground'
            }`}
          >
            {isEditMode ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
            {isEditMode ? 'Editing' : 'Edit Layout'}
          </button>

          {isEditMode && (
            <>
              <button
                onClick={resetLayout}
                className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono text-muted-foreground hover:text-foreground bg-muted/50 border border-border"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>

              {availableToAdd.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowAddMenu(v => !v)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono text-green-400 bg-green-500/10 border border-green-500/30"
                  >
                    <Plus className="w-3 h-3" /> Add Widget
                  </button>
                  {showAddMenu && (
                    <div className="absolute top-full mt-1 left-0 z-30 w-48 bg-card border border-border rounded-lg shadow-2xl">
                      {availableToAdd.map(w => (
                        <button
                          key={w.id}
                          onClick={() => addWidget(w)}
                          className="w-full text-left px-3 py-2 text-[10px] font-mono hover:bg-green-500/10 hover:text-green-400 border-b border-border last:border-b-0"
                        >
                          + {w.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <span className="text-[10px] font-mono text-green-400 animate-pulse ml-2">
                Drag header · Drag any edge or corner to resize
              </span>
            </>
          )}
        </div>

        {/* Resizable/Draggable Grid */}
        <div className={`flex-1 overflow-y-auto bg-background ${isEditMode ? '' : 'rgl-locked'}`}>
          <GridLayout
            className="layout"
            layout={visibleLayout}
            cols={12}
            rowHeight={48}
            margin={[1, 1]}
            containerPadding={[4, 4]}
            isDraggable={isEditMode}
            isResizable={isEditMode}
            resizeHandles={ALL_RESIZE_HANDLES}
            draggableHandle=".widget-drag-handle"
            compactType={null}
            preventCollision={true}
            onLayoutChange={setLayout}
            width={1200}
          >
            {rightWidgets.map(widget => (
              <div
                key={widget.id}
                className={`relative bg-card/40 border rounded-lg overflow-hidden flex flex-col ${
                  isEditMode ? 'border-green-500/40 border-dashed' : 'border-border'
                }`}
              >
                {/* Drag handle header */}
                <div
                  className={`widget-drag-handle flex items-center justify-between px-2 py-1 border-b flex-shrink-0 ${
                    isEditMode
                      ? 'bg-green-500/10 border-green-500/30 cursor-grab active:cursor-grabbing'
                      : 'bg-card/60 border-border'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-widest uppercase">
                    {isEditMode && <GripVertical className="w-3 h-3 text-green-400" />}
                    <span className={isEditMode ? 'text-green-400' : 'text-muted-foreground'}>
                      {widget.title}
                    </span>
                  </div>
                  {isEditMode && (
                    <button
                      onClick={e => { e.stopPropagation(); removeWidget(widget.id) }}
                      onMouseDown={e => e.stopPropagation()}
                      className="p-0.5 rounded text-red-400 hover:bg-red-500/20 border border-transparent hover:border-red-500/40"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Widget content */}
                <div className="flex-1 min-h-0 overflow-hidden">
                  {renderRight(widget)}
                </div>
              </div>
            ))}
          </GridLayout>
        </div>
      </div>
    </div>
  )
}
