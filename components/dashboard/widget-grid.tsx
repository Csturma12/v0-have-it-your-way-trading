'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import GridLayoutImport from 'react-grid-layout'
const GridLayout = GridLayoutImport as any
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { Lock, Unlock, RotateCcw, Plus, X, GripVertical, Save, Check, Trash2 } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TradingViewChart } from './tradingview-chart'
import { TradingViewAdvancedChart } from './tradingview-advanced-chart'
import { SectorPillBox } from './sector-pill-box'
import { ThemePillBox } from './theme-pill-box'
import { WatchlistPanel } from './watchlist-panel'
import { NewsWidget } from './news-widget'
import { MarketOverview } from './market-overview'
import { TechnicalIndicators } from './technical-indicators'
import { OptionsChain } from './options-chain'
import { MarketSectorPills } from './market-sector-pills'
import { CompanyProfile } from './company-profile'
import { Fundamentals } from './fundamentals'
import { AnalystRatings } from './analyst-ratings'
import { Metrics } from './metrics'
import { Catalysts } from './catalysts'
import { PatternWatchlist } from './pattern-watchlist'
import { TickerHeaderBar } from './ticker-header-bar'
import { GexLevels } from './gex-levels'
import { TickerInfo } from './ticker-info'
import { SupportResistance } from './support-resistance'
import { CatalystsRisk } from './catalysts-risk'
import { QuickTradeBox } from './quick-trade-box'
import { QuickTradeIdeas } from './quick-trade-ideas'
import { WidgetErrorBoundary } from './widget-error-boundary'
import { NewsTickerBanner } from './news-ticker-banner'
import { DarkPoolBlocks } from './dark-pool-blocks'
import { OptionsFlow } from './options-flow'
import { DarkPoolFlow } from './dark-pool-flow'
import { KeyLevels } from './key-levels'
import { IVSurface } from './iv-surface'
import { SignalsFeed } from './signals-feed'
import { OiChanges } from './oi-changes'
import {
  Cpu,
  Scale,
  Server,
  Shield,
  Flame,
  Stethoscope,
  Zap,
  Globe,
  BarChart2,
} from 'lucide-react'

// ─── Sortable wrapper for sidebar pill boxes ────────────────────────────────
function SortablePillItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 50 : 'auto',
      }}
      className="relative group/sortable"
    >
      {/* Drag handle — appears on hover at the left edge */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-0 bottom-0 w-3 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover/sortable:opacity-100 transition-opacity z-10"
        title="Drag to reorder"
      >
        <GripVertical className="w-2.5 h-2.5 text-muted-foreground/50" />
      </div>
      <div className="pl-3">
        {children}
      </div>
    </div>
  )
}

// STORAGE_KEY removed — localStorage persistence replaced with in-memory state.
// TODO: Supabase-backed named layout templates
// Layout is intentionally NOT persisted by default — the default layout is always restored
// on page load. Only explicit "Save Layout" in edit mode writes to storage.

const ALL_RESIZE_HANDLES: Array<'s' | 'w' | 'e' | 'n' | 'sw' | 'nw' | 'se' | 'ne'> = [
  's', 'w', 'e', 'n', 'sw', 'nw', 'se', 'ne',
]

// ─── Sector ticker data (10-20 per sector) ──────────────────────────────────

const SECTOR_DATA = {
  'sector-ai': {
    title: 'AI & Technology',
    accent: 'green' as const,
    tickers: [
      { symbol: 'NVDA', price: 924.73, change: 4.21, signal: 'BUY' as const, conviction: 0.94, trending: 1, isHolding: true },
      { symbol: 'META', price: 514.82, change: 2.87, signal: 'BUY' as const, conviction: 0.91, trending: 2 },
      { symbol: 'MSFT', price: 415.30, change: 1.54, signal: 'BUY' as const, conviction: 0.88, trending: 3 },
      { symbol: 'GOOGL', price: 175.20, change: 1.93, signal: 'BUY' as const, conviction: 0.86, trending: 4 },
      { symbol: 'AMD', price: 162.45, change: 3.14, signal: 'BUY' as const, conviction: 0.84, trending: 5 },
      { symbol: 'AMZN', price: 189.34, change: 1.22, signal: 'BUY' as const, conviction: 0.82, trending: 6 },
      { symbol: 'PLTR', price: 24.80, change: 3.88, signal: 'BUY' as const, conviction: 0.80, trending: 7, isHolding: true },
      { symbol: 'NOW', price: 892.40, change: 1.65, signal: 'BUY' as const, conviction: 0.78, trending: 8 },
      { symbol: 'CRM', price: 282.10, change: 0.94, signal: 'HOLD' as const, conviction: 0.72, trending: 9 },
      { symbol: 'ADBE', price: 482.30, change: 0.55, signal: 'HOLD' as const, conviction: 0.68, trending: 10 },
      { symbol: 'ORCL', price: 124.55, change: -0.44, signal: 'HOLD' as const, conviction: 0.65, trending: 11 },
      { symbol: 'IBM', price: 192.80, change: -0.88, signal: 'HOLD' as const, conviction: 0.60, trending: 12 },
      { symbol: 'SNOW', price: 142.30, change: -1.22, signal: 'SELL' as const, conviction: 0.72, trending: 13 },
      { symbol: 'DDOG', price: 128.40, change: -1.55, signal: 'SELL' as const, conviction: 0.68, trending: 14 },
      { symbol: 'ZS', price: 202.10, change: -2.10, signal: 'SELL' as const, conviction: 0.65, trending: 15 },
    ],
  },
  'sector-banking': {
    title: 'Banking & Finance',
    accent: 'gold' as const,
    tickers: [
      { symbol: 'JPM', price: 213.40, change: 2.10, signal: 'BUY' as const, conviction: 0.92, trending: 1 },
      { symbol: 'GS', price: 472.15, change: 1.85, signal: 'BUY' as const, conviction: 0.89, trending: 2 },
      { symbol: 'MS', price: 102.80, change: 1.40, signal: 'BUY' as const, conviction: 0.86, trending: 3 },
      { symbol: 'V', price: 284.50, change: 1.22, signal: 'BUY' as const, conviction: 0.84, trending: 4 },
      { symbol: 'MA', price: 472.30, change: 1.05, signal: 'BUY' as const, conviction: 0.82, trending: 5 },
      { symbol: 'BAC', price: 38.92, change: 0.75, signal: 'BUY' as const, conviction: 0.79, trending: 6 },
      { symbol: 'BRK.B', price: 412.20, change: 0.65, signal: 'BUY' as const, conviction: 0.77, trending: 7 },
      { symbol: 'SCHW', price: 72.40, change: 0.42, signal: 'HOLD' as const, conviction: 0.70, trending: 8 },
      { symbol: 'WFC', price: 57.34, change: 0.28, signal: 'HOLD' as const, conviction: 0.68, trending: 9 },
      { symbol: 'BLK', price: 824.30, change: -0.18, signal: 'HOLD' as const, conviction: 0.65, trending: 10 },
      { symbol: 'C', price: 64.10, change: -0.32, signal: 'HOLD' as const, conviction: 0.62, trending: 11 },
      { symbol: 'AXP', price: 229.60, change: -0.55, signal: 'SELL' as const, conviction: 0.74, trending: 12 },
      { symbol: 'USB', price: 42.80, change: -1.10, signal: 'SELL' as const, conviction: 0.70, trending: 13 },
      { symbol: 'PNC', price: 162.40, change: -1.44, signal: 'SELL' as const, conviction: 0.66, trending: 14 },
    ],
  },
  'sector-energy': {
    title: 'Energy & Industrials',
    accent: 'red' as const,
    tickers: [
      { symbol: 'XOM', price: 112.40, change: 2.44, signal: 'BUY' as const, conviction: 0.90, trending: 1 },
      { symbol: 'SLB', price: 43.20, change: 3.10, signal: 'BUY' as const, conviction: 0.87, trending: 2 },
      { symbol: 'CVX', price: 154.30, change: 1.67, signal: 'BUY' as const, conviction: 0.84, trending: 3 },
      { symbol: 'COP', price: 122.80, change: 1.42, signal: 'BUY' as const, conviction: 0.81, trending: 4 },
      { symbol: 'EOG', price: 128.50, change: 1.18, signal: 'BUY' as const, conviction: 0.78, trending: 5 },
      { symbol: 'PXD', price: 224.30, change: 0.95, signal: 'BUY' as const, conviction: 0.75, trending: 6 },
      { symbol: 'HAL', price: 34.55, change: 0.83, signal: 'HOLD' as const, conviction: 0.71, trending: 7 },
      { symbol: 'DVN', price: 44.20, change: 0.55, signal: 'HOLD' as const, conviction: 0.68, trending: 8 },
      { symbol: 'MPC', price: 172.40, change: 0.22, signal: 'HOLD' as const, conviction: 0.65, trending: 9 },
      { symbol: 'PSX', price: 143.20, change: -0.38, signal: 'HOLD' as const, conviction: 0.62, trending: 10 },
      { symbol: 'VLO', price: 135.10, change: -0.72, signal: 'SELL' as const, conviction: 0.70, trending: 11 },
      { symbol: 'OXY', price: 59.40, change: -1.20, signal: 'SELL' as const, conviction: 0.72, trending: 12 },
      { symbol: 'MRO', price: 26.80, change: -1.55, signal: 'SELL' as const, conviction: 0.68, trending: 13 },
    ],
  },
  'sector-healthcare': {
    title: 'Healthcare & BioPharma',
    accent: 'cyan' as const,
    tickers: [
      { symbol: 'LLY', price: 804.20, change: 3.54, signal: 'BUY' as const, conviction: 0.96, trending: 1, isHolding: true },
      { symbol: 'NVO', price: 122.40, change: 2.90, signal: 'BUY' as const, conviction: 0.93, trending: 2 },
      { symbol: 'UNH', price: 524.30, change: 1.88, signal: 'BUY' as const, conviction: 0.90, trending: 3 },
      { symbol: 'ABBV', price: 175.60, change: 1.72, signal: 'BUY' as const, conviction: 0.88, trending: 4 },
      { symbol: 'TMO', price: 582.40, change: 1.44, signal: 'BUY' as const, conviction: 0.85, trending: 5 },
      { symbol: 'MRK', price: 128.30, change: 0.88, signal: 'BUY' as const, conviction: 0.82, trending: 6 },
      { symbol: 'DHR', price: 252.10, change: 0.65, signal: 'BUY' as const, conviction: 0.79, trending: 7 },
      { symbol: 'ABT', price: 112.40, change: 0.44, signal: 'HOLD' as const, conviction: 0.72, trending: 8 },
      { symbol: 'AMGN', price: 282.10, change: 0.22, signal: 'HOLD' as const, conviction: 0.70, trending: 9 },
      { symbol: 'JNJ', price: 152.40, change: -0.18, signal: 'HOLD' as const, conviction: 0.66, trending: 10 },
      { symbol: 'GILD', price: 78.30, change: -0.55, signal: 'HOLD' as const, conviction: 0.63, trending: 11 },
      { symbol: 'BMY', price: 52.80, change: -0.94, signal: 'SELL' as const, conviction: 0.68, trending: 12 },
      { symbol: 'PFE', price: 26.10, change: -1.44, signal: 'SELL' as const, conviction: 0.72, trending: 13 },
      { symbol: 'BIIB', price: 202.40, change: -2.10, signal: 'SELL' as const, conviction: 0.65, trending: 14 },
    ],
  },
  'sector-consumer': {
    title: 'Consumer & Retail',
    accent: 'green' as const,
    tickers: [
      { symbol: 'COST', price: 882.40, change: 2.24, signal: 'BUY' as const, conviction: 0.92, trending: 1 },
      { symbol: 'WMT', price: 68.20, change: 1.55, signal: 'BUY' as const, conviction: 0.88, trending: 2 },
      { symbol: 'AMZN', price: 189.34, change: 1.22, signal: 'BUY' as const, conviction: 0.85, trending: 3 },
      { symbol: 'HD', price: 344.10, change: 0.92, signal: 'BUY' as const, conviction: 0.82, trending: 4 },
      { symbol: 'LOW', price: 228.40, change: 0.78, signal: 'BUY' as const, conviction: 0.79, trending: 5 },
      { symbol: 'TJX', price: 104.20, change: 0.65, signal: 'BUY' as const, conviction: 0.76, trending: 6 },
      { symbol: 'PG', price: 168.30, change: 0.44, signal: 'HOLD' as const, conviction: 0.72, trending: 7 },
      { symbol: 'KO', price: 62.40, change: 0.28, signal: 'HOLD' as const, conviction: 0.68, trending: 8 },
      { symbol: 'PEP', price: 172.80, change: 0.15, signal: 'HOLD' as const, conviction: 0.65, trending: 9 },
      { symbol: 'MCD', price: 278.50, change: -0.34, signal: 'HOLD' as const, conviction: 0.62, trending: 10 },
      { symbol: 'SBUX', price: 78.30, change: -0.88, signal: 'SELL' as const, conviction: 0.71, trending: 11 },
      { symbol: 'NKE', price: 85.20, change: -1.10, signal: 'SELL' as const, conviction: 0.68, trending: 12 },
      { symbol: 'TGT', price: 142.60, change: -1.55, signal: 'SELL' as const, conviction: 0.72, trending: 13 },
      { symbol: 'DG', price: 128.40, change: -2.20, signal: 'SELL' as const, conviction: 0.75, trending: 14 },
    ],
  },
  'sector-semis': {
    title: 'Semiconductors',
    accent: 'gold' as const,
    tickers: [
      { symbol: 'NVDA', price: 924.73, change: 4.21, signal: 'BUY' as const, conviction: 0.96, trending: 1, isHolding: true },
      { symbol: 'AVGO', price: 1422.10, change: 3.20, signal: 'BUY' as const, conviction: 0.93, trending: 2 },
      { symbol: 'AMD', price: 162.45, change: 3.14, signal: 'BUY' as const, conviction: 0.90, trending: 3 },
      { symbol: 'TSM', price: 142.80, change: 2.55, signal: 'BUY' as const, conviction: 0.88, trending: 4 },
      { symbol: 'MU', price: 128.40, change: 2.44, signal: 'BUY' as const, conviction: 0.86, trending: 5 },
      { symbol: 'AMAT', price: 202.30, change: 1.82, signal: 'BUY' as const, conviction: 0.83, trending: 6 },
      { symbol: 'LRCX', price: 984.20, change: 1.55, signal: 'BUY' as const, conviction: 0.80, trending: 7 },
      { symbol: 'MRVL', price: 72.40, change: 1.22, signal: 'BUY' as const, conviction: 0.77, trending: 8 },
      { symbol: 'KLAC', price: 762.50, change: 0.94, signal: 'HOLD' as const, conviction: 0.72, trending: 9 },
      { symbol: 'SNPS', price: 582.30, change: 0.55, signal: 'HOLD' as const, conviction: 0.68, trending: 10 },
      { symbol: 'CDNS', price: 292.40, change: 0.22, signal: 'HOLD' as const, conviction: 0.65, trending: 11 },
      { symbol: 'QCOM', price: 174.20, change: -0.65, signal: 'HOLD' as const, conviction: 0.62, trending: 12 },
      { symbol: 'ON', price: 72.80, change: -1.10, signal: 'SELL' as const, conviction: 0.70, trending: 13 },
      { symbol: 'INTC', price: 31.40, change: -2.10, signal: 'SELL' as const, conviction: 0.78, trending: 14 },
      { symbol: 'TXN', price: 172.30, change: -1.44, signal: 'SELL' as const, conviction: 0.65, trending: 15 },
    ],
  },
}

// ─── Theme ticker data (10-20 per theme) ────────────────────────────────────

const THEME_DATA = {
  'theme-ai': {
    title: 'AI Industry',
    icon: Cpu,
    tickers: [
      { symbol: 'NVDA', price: 924.73, change: 4.21, signal: 'BUY' as const, conviction: 0.96, trending: 1, isHolding: true },
      { symbol: 'SMCI', price: 744.20, change: 5.12, signal: 'BUY' as const, conviction: 0.93, trending: 2 },
      { symbol: 'MSFT', price: 415.30, change: 1.54, signal: 'BUY' as const, conviction: 0.90, trending: 3 },
      { symbol: 'GOOGL', price: 175.20, change: 1.93, signal: 'BUY' as const, conviction: 0.87, trending: 4 },
      { symbol: 'META', price: 514.82, change: 2.87, signal: 'BUY' as const, conviction: 0.85, trending: 5 },
      { symbol: 'PLTR', price: 24.80, change: 3.88, signal: 'BUY' as const, conviction: 0.83, trending: 6, isHolding: true },
      { symbol: 'AMD', price: 162.45, change: 3.14, signal: 'BUY' as const, conviction: 0.80, trending: 7 },
      { symbol: 'ORCL', price: 124.55, change: 2.33, signal: 'BUY' as const, conviction: 0.78, trending: 8 },
      { symbol: 'NOW', price: 892.40, change: 1.65, signal: 'BUY' as const, conviction: 0.75, trending: 9 },
      { symbol: 'CRM', price: 282.10, change: 0.94, signal: 'HOLD' as const, conviction: 0.70, trending: 10 },
      { symbol: 'SNOW', price: 142.30, change: -0.44, signal: 'HOLD' as const, conviction: 0.65, trending: 11 },
      { symbol: 'PATH', price: 12.40, change: -1.22, signal: 'SELL' as const, conviction: 0.68, trending: 12 },
    ],
  },
  'theme-infra': {
    title: 'AI Infrastructure',
    icon: Server,
    tickers: [
      { symbol: 'VST', price: 89.40, change: 6.22, signal: 'BUY' as const, conviction: 0.95, trending: 1, isHolding: true },
      { symbol: 'AVGO', price: 1422.10, change: 3.20, signal: 'BUY' as const, conviction: 0.92, trending: 2 },
      { symbol: 'CEG', price: 224.80, change: 4.10, signal: 'BUY' as const, conviction: 0.90, trending: 3 },
      { symbol: 'ANET', price: 312.50, change: 2.44, signal: 'BUY' as const, conviction: 0.87, trending: 4 },
      { symbol: 'NXT', price: 52.40, change: 2.10, signal: 'BUY' as const, conviction: 0.84, trending: 5 },
      { symbol: 'DELL', price: 142.80, change: 1.88, signal: 'BUY' as const, conviction: 0.81, trending: 6 },
      { symbol: 'HPE', price: 18.40, change: 1.22, signal: 'BUY' as const, conviction: 0.78, trending: 7 },
      { symbol: 'EQIX', price: 892.30, change: 0.77, signal: 'HOLD' as const, conviction: 0.72, trending: 8 },
      { symbol: 'DLR', price: 142.20, change: 0.44, signal: 'HOLD' as const, conviction: 0.68, trending: 9 },
      { symbol: 'ETN', price: 312.40, change: -0.22, signal: 'HOLD' as const, conviction: 0.65, trending: 10 },
      { symbol: 'AME', price: 172.80, change: -0.55, signal: 'SELL' as const, conviction: 0.62, trending: 11 },
    ],
  },
  'theme-defense': {
    title: 'Defense & Govt',
    icon: Shield,
    tickers: [
      { symbol: 'PLTR', price: 24.80, change: 3.88, signal: 'BUY' as const, conviction: 0.93, trending: 1, isHolding: true },
      { symbol: 'RTX', price: 112.40, change: 1.55, signal: 'BUY' as const, conviction: 0.88, trending: 2 },
      { symbol: 'LMT', price: 482.30, change: 1.22, signal: 'BUY' as const, conviction: 0.85, trending: 3 },
      { symbol: 'GD', price: 292.80, change: 0.92, signal: 'BUY' as const, conviction: 0.82, trending: 4 },
      { symbol: 'NOC', price: 512.10, change: 0.65, signal: 'BUY' as const, conviction: 0.79, trending: 5 },
      { symbol: 'LHX', price: 224.40, change: 0.44, signal: 'HOLD' as const, conviction: 0.72, trending: 6 },
      { symbol: 'HII', price: 272.30, change: 0.22, signal: 'HOLD' as const, conviction: 0.68, trending: 7 },
      { symbol: 'LDOS', price: 152.40, change: -0.18, signal: 'HOLD' as const, conviction: 0.65, trending: 8 },
      { symbol: 'SAIC', price: 124.80, change: -0.55, signal: 'HOLD' as const, conviction: 0.62, trending: 9 },
      { symbol: 'BA', price: 178.40, change: -2.33, signal: 'SELL' as const, conviction: 0.74, trending: 10 },
    ],
  },
  'theme-energy': {
    title: 'Energy Transition',
    icon: Flame,
    tickers: [
      { symbol: 'XOM', price: 112.40, change: 2.44, signal: 'BUY' as const, conviction: 0.90, trending: 1 },
      { symbol: 'SLB', price: 43.20, change: 3.10, signal: 'BUY' as const, conviction: 0.87, trending: 2 },
      { symbol: 'CVX', price: 154.30, change: 1.67, signal: 'BUY' as const, conviction: 0.84, trending: 3 },
      { symbol: 'NEE', price: 72.40, change: 1.44, signal: 'BUY' as const, conviction: 0.81, trending: 4 },
      { symbol: 'COP', price: 122.80, change: 1.12, signal: 'BUY' as const, conviction: 0.78, trending: 5 },
      { symbol: 'FSLR', price: 172.30, change: 0.88, signal: 'BUY' as const, conviction: 0.75, trending: 6 },
      { symbol: 'ENPH', price: 112.40, change: 0.55, signal: 'HOLD' as const, conviction: 0.70, trending: 7 },
      { symbol: 'VST', price: 89.40, change: 0.22, signal: 'HOLD' as const, conviction: 0.67, trending: 8 },
      { symbol: 'CEG', price: 224.80, change: -0.44, signal: 'HOLD' as const, conviction: 0.64, trending: 9 },
      { symbol: 'OXY', price: 59.40, change: -1.20, signal: 'SELL' as const, conviction: 0.72, trending: 10 },
      { symbol: 'RUN', price: 12.80, change: -2.55, signal: 'SELL' as const, conviction: 0.68, trending: 11 },
    ],
  },
  'theme-health': {
    title: 'Healthcare Innovation',
    icon: Stethoscope,
    tickers: [
      { symbol: 'LLY', price: 804.20, change: 3.54, signal: 'BUY' as const, conviction: 0.97, trending: 1, isHolding: true },
      { symbol: 'NVO', price: 122.40, change: 2.90, signal: 'BUY' as const, conviction: 0.94, trending: 2 },
      { symbol: 'ABBV', price: 175.60, change: 1.72, signal: 'BUY' as const, conviction: 0.90, trending: 3 },
      { symbol: 'VRTX', price: 424.30, change: 1.55, signal: 'BUY' as const, conviction: 0.87, trending: 4 },
      { symbol: 'REGN', price: 982.40, change: 1.22, signal: 'BUY' as const, conviction: 0.84, trending: 5 },
      { symbol: 'ISRG', price: 412.80, change: 0.88, signal: 'BUY' as const, conviction: 0.81, trending: 6 },
      { symbol: 'DXCM', price: 72.40, change: 0.55, signal: 'HOLD' as const, conviction: 0.74, trending: 7 },
      { symbol: 'AMGN', price: 282.10, change: 0.22, signal: 'HOLD' as const, conviction: 0.70, trending: 8 },
      { symbol: 'MRNA', price: 102.30, change: -0.88, signal: 'HOLD' as const, conviction: 0.65, trending: 9 },
      { symbol: 'PFE', price: 26.10, change: -1.44, signal: 'SELL' as const, conviction: 0.72, trending: 10 },
      { symbol: 'BNTX', price: 82.40, change: -2.10, signal: 'SELL' as const, conviction: 0.68, trending: 11 },
    ],
  },
  'theme-semis': {
    title: 'Chip Cycle',
    icon: Zap,
    tickers: [
      { symbol: 'NVDA', price: 924.73, change: 4.21, signal: 'BUY' as const, conviction: 0.96, trending: 1, isHolding: true },
      { symbol: 'AMD', price: 162.45, change: 3.14, signal: 'BUY' as const, conviction: 0.92, trending: 2 },
      { symbol: 'MU', price: 128.40, change: 2.44, signal: 'BUY' as const, conviction: 0.89, trending: 3 },
      { symbol: 'AVGO', price: 1422.10, change: 3.20, signal: 'BUY' as const, conviction: 0.86, trending: 4 },
      { symbol: 'TSM', price: 142.80, change: 2.55, signal: 'BUY' as const, conviction: 0.83, trending: 5 },
      { symbol: 'AMAT', price: 202.30, change: 1.82, signal: 'BUY' as const, conviction: 0.80, trending: 6 },
      { symbol: 'LRCX', price: 984.20, change: 1.44, signal: 'BUY' as const, conviction: 0.77, trending: 7 },
      { symbol: 'MRVL', price: 72.40, change: 0.88, signal: 'HOLD' as const, conviction: 0.72, trending: 8 },
      { symbol: 'KLAC', price: 762.50, change: 0.55, signal: 'HOLD' as const, conviction: 0.68, trending: 9 },
      { symbol: 'QCOM', price: 174.20, change: -0.65, signal: 'HOLD' as const, conviction: 0.64, trending: 10 },
      { symbol: 'INTC', price: 31.40, change: -2.10, signal: 'SELL' as const, conviction: 0.78, trending: 11 },
      { symbol: 'ARM', price: 142.30, change: -1.55, signal: 'SELL' as const, conviction: 0.65, trending: 12 },
    ],
  },
  'theme-macro': {
    title: 'Macro & Global',
    icon: Globe,
    tickers: [
      { symbol: 'GLD', price: 214.30, change: 1.88, signal: 'BUY' as const, conviction: 0.85, trending: 1 },
      { symbol: 'SLV', price: 28.40, change: 2.44, signal: 'BUY' as const, conviction: 0.80, trending: 2 },
      { symbol: 'UUP', price: 28.20, change: 0.55, signal: 'HOLD' as const, conviction: 0.68, trending: 3 },
      { symbol: 'SPY', price: 542.80, change: 0.45, signal: 'HOLD' as const, conviction: 0.65, trending: 4 },
      { symbol: 'QQQ', price: 482.10, change: 0.88, signal: 'HOLD' as const, conviction: 0.62, trending: 5 },
      { symbol: 'IWM', price: 202.30, change: -0.22, signal: 'HOLD' as const, conviction: 0.60, trending: 6 },
      { symbol: 'EFA', price: 82.40, change: -0.55, signal: 'HOLD' as const, conviction: 0.58, trending: 7 },
      { symbol: 'EEM', price: 42.10, change: -0.88, signal: 'SELL' as const, conviction: 0.70, trending: 8 },
      { symbol: 'TLT', price: 92.40, change: -1.10, signal: 'SELL' as const, conviction: 0.72, trending: 9 },
      { symbol: 'HYG', price: 78.30, change: -0.44, signal: 'SELL' as const, conviction: 0.65, trending: 10 },
    ],
  },
  'theme-earnings': {
    title: 'Earnings Momentum',
    icon: BarChart2,
    tickers: [
      { symbol: 'META', price: 514.82, change: 2.87, signal: 'BUY' as const, conviction: 0.94, trending: 1 },
      { symbol: 'AMZN', price: 189.34, change: 1.22, signal: 'BUY' as const, conviction: 0.90, trending: 2 },
      { symbol: 'GOOGL', price: 175.20, change: 1.93, signal: 'BUY' as const, conviction: 0.87, trending: 3 },
      { symbol: 'NFLX', price: 624.30, change: 1.55, signal: 'BUY' as const, conviction: 0.84, trending: 4 },
      { symbol: 'MSFT', price: 415.30, change: 1.54, signal: 'BUY' as const, conviction: 0.81, trending: 5 },
      { symbol: 'NOW', price: 892.40, change: 1.22, signal: 'BUY' as const, conviction: 0.78, trending: 6 },
      { symbol: 'CRM', price: 282.10, change: 0.94, signal: 'HOLD' as const, conviction: 0.72, trending: 7 },
      { symbol: 'AAPL', price: 182.50, change: -0.22, signal: 'HOLD' as const, conviction: 0.68, trending: 8 },
      { symbol: 'ADBE', price: 482.30, change: -0.55, signal: 'HOLD' as const, conviction: 0.65, trending: 9 },
      { symbol: 'TSLA', price: 178.20, change: -2.44, signal: 'SELL' as const, conviction: 0.72, trending: 10 },
      { symbol: 'PYPL', price: 62.40, change: -1.88, signal: 'SELL' as const, conviction: 0.68, trending: 11 },
    ],
  },
  'theme-political': {
    title: 'Political & M&A',
    icon: Scale,
    tickers: [
      { symbol: 'GLD', price: 214.30, change: 1.88, signal: 'BUY' as const, conviction: 0.86, trending: 1 },
      { symbol: 'XLF', price: 42.15, change: 1.22, signal: 'BUY' as const, conviction: 0.79, trending: 2 },
      { symbol: 'DJT', price: 32.40, change: 8.44, signal: 'BUY' as const, conviction: 0.72, trending: 3 },
      { symbol: 'SPY', price: 542.80, change: 0.45, signal: 'HOLD' as const, conviction: 0.65, trending: 4 },
      { symbol: 'XLE', price: 92.30, change: 0.22, signal: 'HOLD' as const, conviction: 0.62, trending: 5 },
      { symbol: 'XLV', price: 142.10, change: -0.18, signal: 'HOLD' as const, conviction: 0.60, trending: 6 },
      { symbol: 'TLT', price: 92.40, change: -1.10, signal: 'SELL' as const, conviction: 0.72, trending: 7 },
      { symbol: 'UUP', price: 28.20, change: -0.33, signal: 'SELL' as const, conviction: 0.65, trending: 8 },
    ],
  },
}

// ─── Right-side grid widgets ─────────────────────────────────────────────────

type RightWidgetType =
  | 'chart' | 'watchlist' | 'news' | 'market-overview' | 'technicals'
  | 'options-chain' | 'company-profile' | 'fundamentals' | 'analyst-ratings'
  | 'metrics' | 'catalysts' | 'gex-levels' | 'ticker-info'
  | 'support-resistance' | 'catalysts-risk' | 'quick-trade' | 'trade-ideas'
  | 'dark-pool-blocks'
  // Bundle-backed UW widgets (single shared SWR fetch via useTickerBundle)
  | 'options-flow' | 'dark-pool-flow' | 'key-levels'
  | 'iv-surface' | 'signals-feed' | 'oi-changes'

interface RightWidget {
  id: string
  type: RightWidgetType
  title: string
}

// Master widget registry grouped by section.
// Section sub-headers shown in the Widgets dropdown so users can scan
// quickly and find the right widget without scrolling a flat list of 17.
const WIDGET_SECTIONS: Array<{ section: string; widgets: RightWidget[] }> = [
  {
    section: 'Stock Info',
    widgets: [
      { id: 'ticker-info',        type: 'ticker-info',        title: 'Ticker Info' },
      { id: 'company-profile',    type: 'company-profile',    title: 'Company Profile' },
      { id: 'fundamentals',       type: 'fundamentals',       title: 'Fundamentals' },
      { id: 'metrics',            type: 'metrics',            title: 'Metrics' },
    ],
  },
  {
    section: 'Charts & Technicals',
    widgets: [
      { id: 'chart',              type: 'chart',              title: 'Chart' },
      { id: 'technicals',         type: 'technicals',         title: 'Technical Indicators' },
      { id: 'support-resistance', type: 'support-resistance', title: 'Support & Resistance' },
    ],
  },
  {
    section: 'Catalysts & Analyst',
    widgets: [
      { id: 'analyst-ratings',    type: 'analyst-ratings',    title: 'Analyst Ratings' },
      { id: 'catalysts',          type: 'catalysts',          title: 'Catalysts' },
      { id: 'catalysts-risk',     type: 'catalysts-risk',     title: 'Catalysts & Risk' },
      { id: 'news',               type: 'news',               title: 'Market News' },
    ],
  },
  {
    section: 'Options & Flow',
    widgets: [
      { id: 'options-chain',      type: 'options-chain',      title: 'Options Chain' },
      { id: 'options-flow',       type: 'options-flow',       title: 'Options Flow (Live)' },
      { id: 'oi-changes',         type: 'oi-changes',         title: 'OI Changes' },
      { id: 'gex-levels',         type: 'gex-levels',         title: 'GEX Levels' },
      { id: 'key-levels',         type: 'key-levels',         title: 'Key Levels & Max Pain' },
      { id: 'iv-surface',         type: 'iv-surface',         title: 'IV Surface' },
      { id: 'dark-pool-blocks',   type: 'dark-pool-blocks',   title: 'Dark Pool / Blocks' },
      { id: 'dark-pool-flow',     type: 'dark-pool-flow',     title: 'Dark Pool Flow (Live)' },
      { id: 'signals-feed',       type: 'signals-feed',       title: 'Signals (Flow + Congress + Insider)' },
    ],
  },
  {
    section: 'Trading',
    widgets: [
      { id: 'quick-trade',        type: 'quick-trade',        title: 'Quick Trade' },
      { id: 'trade-ideas',        type: 'trade-ideas',        title: 'Trade Ideas' },
      { id: 'watchlist',          type: 'watchlist',          title: 'Watchlist' },
    ],
  },
  {
    section: 'Market',
    widgets: [
      { id: 'market-overview',    type: 'market-overview',    title: 'Market Overview' },
    ],
  },
]

// Flattened version derived from sections — used for layout lookups, default set, addWidget
const ALL_AVAILABLE_WIDGETS: RightWidget[] = WIDGET_SECTIONS.flatMap(s => s.widgets)

// Default set shown on first load
const DEFAULT_RIGHT_WIDGETS: RightWidget[] = ALL_AVAILABLE_WIDGETS.filter(w =>
  ['ticker-info','company-profile','analyst-ratings','catalysts-risk',
   'chart','watchlist','trade-ideas','news','quick-trade','technicals'].includes(w.id)
)

// Default sizes calibrated for ROW_HEIGHT=10. Each `h` unit = 10px,
// so h:12 = 120px, h:30 = 300px, etc. minH:1 / minW:1 lets users
// shrink any widget down to a single row (~10px) — essentially just
// the title bar — which is the practical floor.
// cols=24, rowHeight=10px
// Layout matches screenshot: 4 widgets top row, chart+watchlist middle, bottom row
const DEFAULT_LAYOUT: any[] = [
  // TOP ROW - 4 widgets side by side, each 6 cols wide, 12 rows tall (~120px)
  { i: 'ticker-info',       x: 0,  y: 0,   w: 6,  h: 12, minH: 1, minW: 1 },
  { i: 'company-profile',   x: 6,  y: 0,   w: 6,  h: 12, minH: 1, minW: 1 },
  { i: 'analyst-ratings',   x: 12, y: 0,   w: 6,  h: 12, minH: 1, minW: 1 },
  { i: 'catalysts-risk',    x: 18, y: 0,   w: 6,  h: 12, minH: 1, minW: 1 },
  // MIDDLE - Chart (18 cols) + Watchlist (6 cols) at h:24 (~240px)
  { i: 'chart',             x: 0,  y: 12,  w: 18, h: 24, minH: 1, minW: 1 },
  { i: 'watchlist',         x: 18, y: 12,  w: 6,  h: 24, minH: 1, minW: 1 },
  // BOTTOM ROW - trade-ideas, news, quick-trade
  { i: 'trade-ideas',       x: 0,  y: 36,  w: 8,  h: 12, minH: 1, minW: 1 },
  { i: 'news',              x: 8,  y: 36,  w: 8,  h: 12, minH: 1, minW: 1 },
  { i: 'quick-trade',       x: 16, y: 36,  w: 8,  h: 12, minH: 1, minW: 1 },
  // TECHNICALS - bottom row 2
  { i: 'technicals',        x: 0,  y: 48,  w: 24, h: 12, minH: 1, minW: 1 },
]

interface SavedState {
  layout: any[]
  rightWidgets: RightWidget[]
  userSaved?: boolean
}

interface WidgetGridProps {
  selectedTicker: string
  onSelectTicker: (t: string) => void
}

export function WidgetGrid({ selectedTicker, onSelectTicker }: WidgetGridProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  
  const [layout, setLayout] = useState(DEFAULT_LAYOUT)
  const [rightWidgets, setRightWidgets] = useState<RightWidget[]>(DEFAULT_RIGHT_WIDGETS)
  // Edit mode is ON by default so all widgets are immediately drag/resize-able
  // from all 4 corners + 4 edges. User can toggle it off via the Lock button
  // to prevent accidental moves.
  const [isEditMode, setIsEditMode] = useState(true)

  const [showLayoutMenu, setShowLayoutMenu] = useState(false)
  const [layoutSaved, setLayoutSaved] = useState(false)
  
  // Named layouts feature
  const [savedLayouts, setSavedLayouts] = useState<Array<{ name: string; layout: any[]; widgets: RightWidget[] }>>([])
  const [newLayoutName, setNewLayoutName] = useState('')
  const [wrapperWidth, setWrapperWidth] = useState(1200)
  const [wrapperHeight, setWrapperHeight] = useState(800)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Sidebar drag-to-reorder state — persisted to localStorage (SSR-safe)
  const [sectorOrder, setSectorOrder] = useState<string[]>(() => Object.keys(SECTOR_DATA))
  const [themeOrder, setThemeOrder]   = useState<string[]>(() => Object.keys(THEME_DATA))

  // Hydrate from localStorage AFTER mount (avoids SSR/hydration mismatch)
  useEffect(() => {
    try {
      const sec = localStorage.getItem('sidebar-sector-order')
      if (sec) {
        const parsed = JSON.parse(sec) as string[]
        if (Array.isArray(parsed) && parsed.every(k => k in SECTOR_DATA)) setSectorOrder(parsed)
      }
    } catch { /* ignore */ }
    try {
      const thm = localStorage.getItem('sidebar-theme-order')
      if (thm) {
        const parsed = JSON.parse(thm) as string[]
        if (Array.isArray(parsed) && parsed.every(k => k in THEME_DATA)) setThemeOrder(parsed)
      }
    } catch { /* ignore */ }
  }, [])

  const sectorSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const themeSensors  = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const handleSectorDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setSectorOrder(prev => {
      const next = arrayMove(prev, prev.indexOf(String(active.id)), prev.indexOf(String(over.id)))
      try { localStorage.setItem('sidebar-sector-order', JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }, [])

  const handleThemeDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setThemeOrder(prev => {
      const next = arrayMove(prev, prev.indexOf(String(active.id)), prev.indexOf(String(over.id)))
      try { localStorage.setItem('sidebar-theme-order', JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }, [])

  // Track wrapper width AND height for responsive grid
  useEffect(() => {
    const updateSize = () => {
      if (wrapperRef.current) {
        setWrapperWidth(wrapperRef.current.offsetWidth)
        setWrapperHeight(wrapperRef.current.offsetHeight)
      }
    }
    updateSize()
    const resizeObserver = new ResizeObserver(updateSize)
    if (wrapperRef.current) resizeObserver.observe(wrapperRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  // Fine-grained rowHeight (10px). react-grid-layout snaps height to
  // integer multiples of rowHeight, so a smaller value = smoother
  // "free" resize. With ROW_HEIGHT=10 users can resize in 10px
  // increments, which feels continuous — no more "stuck at certain
  // heights." The wrapper scrolls vertically when the grid grows
  // beyond the viewport.
  const ROW_HEIGHT = 10
  const rowHeight = ROW_HEIGHT

  // TODO: Replace with Supabase-backed named templates (Scalping View, Swing View, etc.)
  // For now: no persistence. Always load DEFAULT_LAYOUT and DEFAULT_RIGHT_WIDGETS on mount.

  // Save layout with a custom name (in-memory only until Supabase templates are built)
  const saveLayoutWithName = () => {
    if (!newLayoutName.trim()) return
    const newSavedLayout = {
      name: newLayoutName.trim(),
      layout: [...layout],
      widgets: [...rightWidgets],
    }
    setSavedLayouts(prev => [...prev.filter(l => l.name !== newLayoutName.trim()), newSavedLayout])
    setNewLayoutName('')
    setLayoutSaved(true)
    setTimeout(() => setLayoutSaved(false), 2000)
  }

  // Save layout shortcut
  const saveLayout = () => {
    setLayoutSaved(true)
    setTimeout(() => setLayoutSaved(false), 2000)
  }

  // Load a saved layout by name
  const loadSavedLayout = (saved: { name: string; layout: any[]; widgets: RightWidget[] }) => {
    const normalized = saved.layout.map((item: any) => ({
      ...item,
      minH: 1,
      minW: 1,
      maxH: undefined,
      maxW: undefined,
    }))
    setLayout(normalized)
    setRightWidgets(saved.widgets)
    setShowLayoutMenu(false)
  }

  // Delete a saved layout
  const deleteSavedLayout = (name: string) => {
    setSavedLayouts(prev => prev.filter(l => l.name !== name))
  }

  // Reset to default layout
  const resetLayout = () => {
    setLayout(DEFAULT_LAYOUT)
    setRightWidgets(DEFAULT_RIGHT_WIDGETS)
    setShowLayoutMenu(false)
  }

  // No-op: widget visibility changes are in-memory only
  useEffect(() => {
    // TODO: persist rightWidgets to Supabase when template saving is implemented
  }, [rightWidgets])

  const removeWidget = (id: string) => {
    setRightWidgets(w => w.filter(x => x.id !== id))
    setLayout(l => l.filter(x => x.i !== id))
  }

  // All widgets that can be added (default + addon, minus currently visible).
  // minH/minW set to 1 so users can freely shrink any added widget all
  // the way down to title-bar height (~30px) without ever disappearing.
  const addWidget = (meta: RightWidget) => {
    const def = DEFAULT_LAYOUT.find(l => l.i === meta.id) ?? {
      i: meta.id, x: 0, y: Infinity, w: 4, h: 15, minH: 1, minW: 1,
    }
    setRightWidgets(w => [...w, meta])
    setLayout(l => [...l, def])
  }

  const visibleLayout = useMemo(
    () => layout.filter(l => rightWidgets.some(w => w.id === l.i)),
    [layout, rightWidgets]
  )

  const renderRight = (widget: RightWidget) => {
    if (widget.type === 'chart')           return <TradingViewAdvancedChart ticker={selectedTicker} onChangeTicker={onSelectTicker} />
    if (widget.type === 'company-profile')   return <CompanyProfile ticker={selectedTicker} />
    if (widget.type === 'ticker-info')       return <TickerInfo ticker={selectedTicker} />
    if (widget.type === 'support-resistance')return <SupportResistance ticker={selectedTicker} />
    if (widget.type === 'fundamentals')      return <Fundamentals ticker={selectedTicker} />
    if (widget.type === 'analyst-ratings') return <AnalystRatings ticker={selectedTicker} />
    if (widget.type === 'metrics')         return <Metrics ticker={selectedTicker} />
    if (widget.type === 'catalysts')       return <Catalysts ticker={selectedTicker} />
    if (widget.type === 'catalysts-risk')  return <CatalystsRisk ticker={selectedTicker} />
    if (widget.type === 'gex-levels')      return <GexLevels ticker={selectedTicker} />
    if (widget.type === 'watchlist')       return <WatchlistPanel onSelectTicker={onSelectTicker} selectedTicker={selectedTicker} />
    if (widget.type === 'news')            return <NewsWidget onSelectTicker={onSelectTicker} selectedTicker={selectedTicker} />
    if (widget.type === 'market-overview') return <MarketOverview onSelectTicker={onSelectTicker} />
    if (widget.type === 'technicals')      return <TechnicalIndicators ticker={selectedTicker} />
    if (widget.type === 'options-chain')   return <OptionsChain ticker={selectedTicker} />
    if (widget.type === 'quick-trade')     return <QuickTradeBox selectedTicker={selectedTicker} price={null} />
    if (widget.type === 'trade-ideas')     return <QuickTradeIdeas onSelectIdea={(ticker) => onSelectTicker(ticker)} />
    if (widget.type === 'dark-pool-blocks') return <DarkPoolBlocks ticker={selectedTicker} />
    if (widget.type === 'options-flow')    return <OptionsFlow ticker={selectedTicker} />
    if (widget.type === 'dark-pool-flow')  return <DarkPoolFlow ticker={selectedTicker} />
    if (widget.type === 'key-levels')      return <KeyLevels ticker={selectedTicker} />
    if (widget.type === 'iv-surface')      return <IVSurface ticker={selectedTicker} />
    if (widget.type === 'signals-feed')    return <SignalsFeed ticker={selectedTicker} />
    if (widget.type === 'oi-changes')      return <OiChanges ticker={selectedTicker} />
    return null
  }

  return (
    <div className={`flex h-full overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''}`}>

      {/* ── LEFT SIDEBAR: sectors + themes, sortable, scrollable ── */}
      {!isFullscreen && (
        <aside className="w-[280px] flex-shrink-0 border-r border-border overflow-y-auto bg-card/20">
        <div className="p-1.5 space-y-1">
          {/* Sectors Header */}
          <div className="px-2 pt-1 pb-0.5 flex items-center gap-1.5">
            <span className="text-[9px] font-mono font-bold tracking-widest uppercase text-muted-foreground">
              SECTORS
            </span>
            <span className="text-[8px] font-mono text-muted-foreground/40 ml-auto">drag to reorder</span>
          </div>
          <DndContext sensors={sectorSensors} collisionDetection={closestCenter} onDragEnd={handleSectorDragEnd}>
            <SortableContext items={sectorOrder} strategy={verticalListSortingStrategy}>
              {sectorOrder.map(key => {
                const sector = SECTOR_DATA[key as keyof typeof SECTOR_DATA]
                if (!sector) return null
                return (
                  <SortablePillItem key={key} id={key}>
                    <SectorPillBox
                      title={sector.title}
                      accent={sector.accent}
                      tickers={sector.tickers}
                      onSelectTicker={onSelectTicker}
                    />
                  </SortablePillItem>
                )
              })}
            </SortableContext>
          </DndContext>

          {/* Themes Header */}
          <div className="px-2 pt-3 pb-0.5 border-t border-border/30 mt-2 flex items-center gap-1.5">
            <span className="text-[9px] font-mono font-bold tracking-widest uppercase text-muted-foreground">
              THEMES
            </span>
            <span className="text-[8px] font-mono text-muted-foreground/40 ml-auto">drag to reorder</span>
          </div>
          <DndContext sensors={themeSensors} collisionDetection={closestCenter} onDragEnd={handleThemeDragEnd}>
            <SortableContext items={themeOrder} strategy={verticalListSortingStrategy}>
              {themeOrder.map(key => {
                const theme = THEME_DATA[key as keyof typeof THEME_DATA]
                if (!theme) return null
                return (
                  <SortablePillItem key={key} id={key}>
                    <ThemePillBox
                      title={theme.title}
                      icon={theme.icon}
                      tickers={theme.tickers}
                      onSelectTicker={onSelectTicker}
                    />
                  </SortablePillItem>
                )
              })}
            </SortableContext>
          </DndContext>

          {/* Market Overview Pills — sectors, gainers, losers, most active */}
          <div className="px-2 pt-3 pb-0.5 border-t border-border/30 mt-2">
            <span className="text-[9px] font-mono font-bold tracking-widest uppercase text-muted-foreground">
              MARKET OVERVIEW
            </span>
          </div>
          <MarketSectorPills onSelectTicker={onSelectTicker} />

        </div>
        </aside>
      )}

      {/* ── RIGHT AREA: toolbar + draggable/resizable grid ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-card/30 flex-shrink-0">
          
          {/* Widgets Dropdown Menu */}
          <div className="relative">
            <button
              onClick={() => setShowLayoutMenu(v => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wider uppercase transition-colors border bg-muted/50 text-muted-foreground border-border hover:text-foreground"
            >
              ⚙ Layouts & Widgets
            </button>
            
            {showLayoutMenu && (
              <div className="absolute top-full mt-1 left-0 z-30 w-64 bg-card border border-border rounded-lg shadow-2xl">
                {/* Edit Layout Option */}
                <button
                  onClick={() => { setIsEditMode(v => !v); setShowLayoutMenu(false) }}
                  className="w-full text-left px-3 py-2 text-[10px] font-mono hover:bg-primary/10 border-b border-border flex items-center gap-2"
                >
                  {isEditMode ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  {isEditMode ? 'Stop Editing' : 'Edit Layout'}
                </button>

                {isEditMode && (
                  <>
                    {/* Reset */}
                    <button
                      onClick={() => { resetLayout(); setShowLayoutMenu(false) }}
                      className="w-full text-left px-3 py-2 text-[10px] font-mono hover:bg-red-500/10 hover:text-red-400 border-b border-border flex items-center gap-2"
                    >
                      <RotateCcw className="w-3 h-3" /> Reset to Default
                    </button>

                    {/* Flat inline list of all widgets — no section sub-headers.
                        Order is preserved from WIDGET_SECTIONS via ALL_AVAILABLE_WIDGETS
                        (which is .flatMap'd in the same declaration order). */}
                    <div className="max-h-80 overflow-y-auto border-b border-border">
                      {ALL_AVAILABLE_WIDGETS.map(w => {
                        const isActive = !!rightWidgets.find(rw => rw.id === w.id)
                        return (
                          <button
                            key={w.id}
                            onClick={() => {
                              if (isActive) {
                                setRightWidgets(prev => prev.filter(rw => rw.id !== w.id))
                              } else {
                                addWidget(w)
                              }
                            }}
                            className={`w-full text-left px-3 py-1.5 text-[9px] font-mono flex items-center justify-between group transition-colors ${
                              isActive
                                ? 'text-foreground hover:bg-red-500/10 hover:text-red-400'
                                : 'text-muted-foreground hover:bg-green-500/10 hover:text-green-400'
                            }`}
                          >
                            <span>{w.title}</span>
                            <span className={`text-[8px] ${isActive ? 'text-primary/60 group-hover:text-red-400' : 'text-muted-foreground/40 group-hover:text-green-400'}`}>
                              {isActive ? 'visible' : '+ add'}
                            </span>
                          </button>
                        )
                      })}
                    </div>

                    {/* Save Current Layout */}
                    <div className="px-3 py-2 border-b border-border">
                      <div className="flex gap-1 mb-1">
                        <input
                          type="text"
                          placeholder="Layout name..."
                          value={newLayoutName}
                          onChange={(e) => setNewLayoutName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveLayoutWithName()}
                          className="flex-1 h-5 text-[9px] font-mono bg-muted/30 border border-border/50 rounded px-1.5"
                        />
                        <button
                          onClick={saveLayoutWithName}
                          className="px-2 py-1 text-[9px] font-mono bg-primary/20 hover:bg-primary/30 border border-primary/30 rounded"
                        >
                          Save
                        </button>
                      </div>
                    </div>

                    {/* Saved Layouts */}
                    {savedLayouts.length > 0 && (
                      <>
                        <div className="px-3 py-1.5 text-[8px] font-mono font-bold text-muted-foreground uppercase">
                          Saved Layouts
                        </div>
                        {savedLayouts.map(saved => (
                          <div key={saved.name} className="flex items-center gap-1 px-3 py-1.5 border-b border-border hover:bg-muted/20">
                            <button
                              onClick={() => { loadSavedLayout(saved); setShowLayoutMenu(false) }}
                              className="flex-1 text-left text-[10px] font-mono hover:text-primary"
                            >
                              {saved.name}
                            </button>
                            <button
                              onClick={() => deleteSavedLayout(saved.name)}
                              className="text-muted-foreground hover:text-red-400"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                      </>
                    )}

                    {/* System Layouts */}
                    <div className="px-3 py-1.5 text-[8px] font-mono font-bold text-muted-foreground uppercase border-t border-border">
                      System Layouts
                    </div>
                    <button
                      onClick={() => { resetLayout(); setShowLayoutMenu(false) }}
                      className="w-full text-left px-3 py-1.5 text-[10px] font-mono hover:bg-muted/20 hover:text-primary"
                    >
                      Default Layout
                    </button>
                  </>
                )}

                <div className="border-t border-border px-3 py-1.5">
                  <button
                    onClick={() => setIsFullscreen(v => !v)}
                    className="w-full flex items-center gap-2 text-left text-[10px] font-mono hover:text-primary"
                  >
                    {isFullscreen ? '⛶' : '⛶'} {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Live news ticker — flexes to fill the rest of the toolbar */}
          <NewsTickerBanner />
        </div>

        {/* Grid */}
        <style jsx global>{`
          .react-grid-item > .react-resizable-handle {
            position: absolute;
            width: 16px;
            height: 16px;
            background: rgba(34, 197, 94, 0.8);
            border-radius: 3px;
            z-index: 100;
            pointer-events: auto !important;
            opacity: 1;
            transition: background 0.15s, transform 0.15s;
          }
          .react-grid-item > .react-resizable-handle:hover {
            background: rgba(34, 197, 94, 1);
            transform: scale(1.2);
          }
          .react-grid-item > .react-resizable-handle::after {
            content: '';
            position: absolute;
            width: 6px;
            height: 6px;
            border-right: 2px solid rgba(255,255,255,0.9);
            border-bottom: 2px solid rgba(255,255,255,0.9);
          }
          .react-resizable-handle-sw { bottom: -4px; left: -4px; cursor: sw-resize; }
          .react-resizable-handle-sw::after { transform: rotate(135deg); bottom: 4px; left: 4px; }
          .react-resizable-handle-se { bottom: -4px; right: -4px; cursor: se-resize; }
          .react-resizable-handle-se::after { transform: rotate(45deg); bottom: 4px; right: 4px; }
          .react-resizable-handle-nw { top: -4px; left: -4px; cursor: nw-resize; }
          .react-resizable-handle-nw::after { transform: rotate(-135deg); top: 4px; left: 4px; }
          .react-resizable-handle-ne { top: -4px; right: -4px; cursor: ne-resize; }
          .react-resizable-handle-ne::after { transform: rotate(-45deg); top: 4px; right: 4px; }
          .react-resizable-handle-w { left: -4px; top: 50%; transform: translateY(-50%); cursor: w-resize; width: 10px; height: 24px; }
          .react-resizable-handle-e { right: -4px; top: 50%; transform: translateY(-50%); cursor: e-resize; width: 10px; height: 24px; }
          .react-resizable-handle-n { top: -4px; left: 50%; transform: translateX(-50%); cursor: n-resize; width: 24px; height: 10px; }
          .react-resizable-handle-s { bottom: -4px; left: 50%; transform: translateX(-50%); cursor: s-resize; width: 24px; height: 10px; }
          .react-resizable-handle-w::after, .react-resizable-handle-e::after,
          .react-resizable-handle-n::after, .react-resizable-handle-s::after { display: none; }
          .react-resizable-handle-w:hover, .react-resizable-handle-e:hover { transform: translateY(-50%) scale(1.1); }
          .react-resizable-handle-n:hover, .react-resizable-handle-s:hover { transform: translateX(-50%) scale(1.1); }
        `}</style>
        <div ref={wrapperRef} className={`flex-1 overflow-y-auto overflow-x-hidden widget-scroll ${isEditMode ? '' : 'rgl-locked'}`}>
          <GridLayout
            className="layout"
            layout={visibleLayout}
            cols={24}
            rowHeight={rowHeight}
            // Zero margin/padding so widgets sit flush against each
            // other (no gap stripes between cards). Borders provide
            // the visual separation.
            margin={[0, 0]}
            containerPadding={[0, 0]}
            isDraggable={isEditMode}
            isResizable={isEditMode}
            resizeHandles={['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se']}
            draggableHandle=".widget-drag-handle"
            // compactType="vertical" + preventCollision=false lets users
            // resize any widget to any size — neighbors get pushed down
            // automatically. Previously this was {null} + preventCollision
            // true, which blocked any resize that would touch a neighbor
            // (the grid silently aborted the drag), making widgets feel
            // "stuck" at certain heights.
            compactType="vertical"
            preventCollision={false}
            onLayoutChange={(newLayout: any) => {
              setLayout(newLayout)
            }}
            width={wrapperWidth}
          >
            {rightWidgets.map(widget => (
              <div
                key={widget.id}
                className={`h-full bg-card border border-border flex flex-col relative ${isEditMode ? 'ring-2 ring-primary/30' : ''}`}
              >
                {/* Widget header / drag bar */}
                <div className={`widget-drag-handle flex items-center justify-between px-2 py-1 border-b border-border/50 bg-muted/30 ${isEditMode ? 'cursor-grab' : ''}`}>
                  <div className="flex items-center gap-1.5">
                    {isEditMode && <GripVertical className="w-3 h-3 text-green-500" />}
                    <span className="text-[10px] font-mono font-bold uppercase text-muted-foreground">
                      {widget.title}
                    </span>
                    {/* Show ticker in header for all widgets except company-profile (redundant there) */}
                    {selectedTicker && widget.type !== 'company-profile' && widget.type !== 'watchlist' && widget.type !== 'news' && widget.type !== 'trade-ideas' && widget.type !== 'market-overview' && (
                      <span className="text-[9px] font-mono text-primary/70">— {selectedTicker}</span>
                    )}
                  </div>
                  {isEditMode && (
                    <button onClick={() => removeWidget(widget.id)} className="text-muted-foreground hover:text-red-400">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {/* Widget content — scrollable if widget is small */}
                <div className="flex-1 min-h-0 overflow-auto">
                  <WidgetErrorBoundary widgetName={widget.title}>
                    {renderRight(widget)}
                  </WidgetErrorBoundary>
                </div>
              </div>
            ))}
          </GridLayout>
        </div>
      </div>
    </div>
  )
}
