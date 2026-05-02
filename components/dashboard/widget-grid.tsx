'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import GridLayoutImport from 'react-grid-layout'
const GridLayout = GridLayoutImport as any
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { Lock, Unlock, RotateCcw, Plus, X, GripVertical, Save, Check, Trash2, Star, ChevronUp, ChevronDown } from 'lucide-react'
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
import { CommoditiesPills } from './commodities-pills'
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
// Combo widgets — unify related panels into a single grid cell to save space
import { DarkPoolCombo } from './dark-pool-combo'
import { OptionsCombo } from './options-combo'
import { LevelsCombo } from './levels-combo'
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

// ─── Right-side grid widgets ─────────────────────────���───────────────────────

type RightWidgetType =
  | 'chart' | 'watchlist' | 'news' | 'market-overview' | 'technicals'
  | 'options-chain' | 'company-profile' | 'fundamentals' | 'analyst-ratings'
  | 'metrics' | 'catalysts' | 'gex-levels' | 'ticker-info'
  | 'support-resistance' | 'catalysts-risk' | 'quick-trade' | 'trade-ideas'
  | 'dark-pool-blocks'
  // Bundle-backed UW widgets (single shared SWR fetch via useTickerBundle)
  | 'options-flow' | 'dark-pool-flow' | 'key-levels'
  | 'iv-surface' | 'signals-feed' | 'oi-changes'
  // Combo widgets — combine related panels into one grid cell
  | 'dark-pool-combo' | 'options-combo' | 'levels-combo'

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
    section: 'Combos',
    widgets: [
      // Combine related panels into a single grid cell to save space.
      // Each combo dispatches to the same underlying widgets, so saved
      // layouts referencing the standalone IDs continue to work.
      { id: 'options-combo',      type: 'options-combo',      title: 'Options Chain + Flow' },
      { id: 'dark-pool-combo',    type: 'dark-pool-combo',    title: 'Dark Pool Blocks + Flow' },
      { id: 'levels-combo',       type: 'levels-combo',       title: 'Levels (Key / S&R / GEX)' },
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

// Default set shown on first load - matches DEFAULT_LAYOUT below
const DEFAULT_RIGHT_WIDGETS: RightWidget[] = ALL_AVAILABLE_WIDGETS.filter(w =>
  ['ticker-info','company-profile','technicals','catalysts-risk','analyst-ratings',
   'chart','watchlist','trade-ideas','quick-trade','market-overview','news'].includes(w.id)
)

// Trading terminal layout - matches user's reference screenshots.
// Grid: cols=24, ROW_HEIGHT=10px. Total height ~800px (standard laptop viewport).
// Layout structure:
//   TOP ROW (180px):    5 info widgets equal height across full width
//   CHART ROW (300px):  big chart on left, watchlist on right (under analyst-ratings)
//   ACTION ROW (180px): trade-ideas + quick-trade side by side, market-overview right
//   NEWS ROW (140px):   news full width, market-overview spans down to align
const DEFAULT_LAYOUT: any[] = [
  // TOP ROW (h:18 = 180px) - all 5 widgets equal height
  { i: 'ticker-info',       x: 0,   y: 0,   w: 5,  h: 18, minH: 1, minW: 1 },
  { i: 'company-profile',   x: 5,   y: 0,   w: 5,  h: 18, minH: 1, minW: 1 },
  { i: 'technicals',        x: 10,  y: 0,   w: 5,  h: 18, minH: 1, minW: 1 },
  { i: 'catalysts-risk',    x: 15,  y: 0,   w: 5,  h: 18, minH: 1, minW: 1 },
  { i: 'analyst-ratings',   x: 20,  y: 0,   w: 4,  h: 18, minH: 1, minW: 1 },

  // CHART ROW (h:30 = 300px) - chart with watchlist on right
  { i: 'chart',             x: 0,   y: 18,  w: 20, h: 30, minH: 1, minW: 1 },
  { i: 'watchlist',         x: 20,  y: 18,  w: 4,  h: 30, minH: 1, minW: 1 },

  // ACTION ROW (h:18 = 180px) - trade-ideas + quick-trade, market-overview on right
  { i: 'trade-ideas',       x: 0,   y: 48,  w: 10, h: 18, minH: 1, minW: 1 },
  { i: 'quick-trade',       x: 10,  y: 48,  w: 10, h: 18, minH: 1, minW: 1 },
  { i: 'market-overview',   x: 20,  y: 48,  w: 4,  h: 32, minH: 1, minW: 1 },

  // NEWS ROW (h:14 = 140px) - news full width, aligns with bottom of market-overview
  { i: 'news',              x: 0,   y: 66,  w: 20, h: 14, minH: 1, minW: 1 },
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
  // Default to LOCKED. User clicks "Edit Layout" in the layout menu to
  // unlock dragging/resizing. Most users want a fixed Bloomberg-style
  // dashboard, not an accidentally-resized one.
  const [isEditMode, setIsEditMode] = useState(false)

  // (Collapse-to-header state lives further down, alongside the persistence
  // keys — see COLLAPSED_KEY / COLLAPSED_H / collapsedHeights / toggleCollapse.)

  const [showLayoutMenu, setShowLayoutMenu] = useState(false)
  const [layoutSaved, setLayoutSaved] = useState(false)
  
  // Named layouts feature
  const [savedLayouts, setSavedLayouts] = useState<Array<{ name: string; layout: any[]; widgets: RightWidget[] }>>([])
  const [newLayoutName, setNewLayoutName] = useState('')
  const [wrapperWidth, setWrapperWidth] = useState(1200)
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

  // Track only wrapper width for responsive grid. Height is NOT tracked
  // because rowHeight is now fixed (see below) — measuring wrapper height
  // caused a feedback loop where taller widgets made the wrapper taller,
  // which made rowHeight bigger, which made widgets even taller.
  useEffect(() => {
    const updateSize = () => {
      if (wrapperRef.current) {
        setWrapperWidth(wrapperRef.current.offsetWidth)
      }
    }
    updateSize()
    const resizeObserver = new ResizeObserver(updateSize)
    if (wrapperRef.current) resizeObserver.observe(wrapperRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  // Fixed 10px rowHeight. With our default layout (~80 rows tall) the whole
  // dashboard is ~800px — fits a standard laptop viewport without scroll.
  // Users can unlock "Edit Layout" mode to resize widgets if they want.
  const rowHeight = 10

  // Simple localStorage persistence so manual resizes survive HMR / refresh.
  // Bump VERSION when DEFAULT_LAYOUT changes to force fresh layout for all users.
  const LAYOUT_VERSION = 7
  const STORAGE_KEY = `v0-widget-grid-layout-v${LAYOUT_VERSION}`
  const SAVED_LAYOUTS_KEY = `v0-widget-grid-saved-layouts-v${LAYOUT_VERSION}`
  // Name of the saved layout the user marked as their personal default.
  // Loaded BEFORE DEFAULT_LAYOUT on mount so a refresh restores their pick.
  const DEFAULT_LAYOUT_NAME_KEY = `v0-widget-grid-default-name-v${LAYOUT_VERSION}`
  const [defaultLayoutName, setDefaultLayoutName] = useState<string | null>(null)
  // Track whether we've finished the first-mount restore. We don't want to
  // overwrite localStorage with the empty initial state before we've loaded.
  const [hasHydrated, setHasHydrated] = useState(false)

  // Per-widget collapsed state. Map of widget id -> the height (in grid rows)
  // the widget had BEFORE collapsing, so we can restore it on expand. While
  // an id is in this map, the widget renders as a header-only strip and its
  // layout `h` is forced to COLLAPSED_H.
  const COLLAPSED_KEY = `v0-widget-grid-collapsed-v${LAYOUT_VERSION}`
  const COLLAPSED_H = 3 // 3 rows × 10px rowHeight = ~30px, fits the header
  const [collapsedHeights, setCollapsedHeights] = useState<Record<string, number>>({})
  // Note: per-widget `isCollapsed` is computed inside the render loop from
  // `layoutItem.h <= COLLAPSED_H` — that's the source of truth so collapse
  // survives layout import/load. The `collapsedHeights` map only tracks the
  // height to restore to when expanding.

  // Restore on mount + clean up old layout versions
  useEffect(() => {
    try {
      // Delete every cached layout from older versions so the user's
      // browser doesn't accumulate stale data forever.
      Object.keys(localStorage)
        .filter(k => k.startsWith('v0-widget-grid-layout-v') && k !== STORAGE_KEY)
        .forEach(k => localStorage.removeItem(k))
      Object.keys(localStorage)
        .filter(k => k.startsWith('v0-widget-grid-saved-layouts-v') && k !== SAVED_LAYOUTS_KEY)
        .forEach(k => localStorage.removeItem(k))
      Object.keys(localStorage)
        .filter(k => k.startsWith('v0-widget-grid-default-name-v') && k !== DEFAULT_LAYOUT_NAME_KEY)
        .forEach(k => localStorage.removeItem(k))
      Object.keys(localStorage)
        .filter(k => k.startsWith('v0-widget-grid-collapsed-v') && k !== COLLAPSED_KEY)
        .forEach(k => localStorage.removeItem(k))

      // Restore per-widget collapsed state (map of id -> previous height)
      try {
        const collapsedRaw = localStorage.getItem(COLLAPSED_KEY)
        if (collapsedRaw) {
          const parsedCollapsed = JSON.parse(collapsedRaw)
          if (parsedCollapsed && typeof parsedCollapsed === 'object') {
            setCollapsedHeights(parsedCollapsed)
          }
        }
      } catch { /* ignore */ }

      // 1) Restore saved layouts library
      const savedLib = localStorage.getItem(SAVED_LAYOUTS_KEY)
      let restoredLib: Array<{ name: string; layout: any[]; widgets: RightWidget[] }> = []
      if (savedLib) {
        try {
          const parsedLib = JSON.parse(savedLib)
          if (Array.isArray(parsedLib)) {
            restoredLib = parsedLib
            setSavedLayouts(parsedLib)
          }
        } catch { /* ignore corrupt entry */ }
      }

      // 2) Restore the user's chosen default name
      const chosenDefault = localStorage.getItem(DEFAULT_LAYOUT_NAME_KEY)
      if (chosenDefault) setDefaultLayoutName(chosenDefault)

      // 3) Restore the live layout — prefer the user's chosen default if it
      //    still exists in the saved library; otherwise fall back to the
      //    last-active layout from STORAGE_KEY.
      const matchingDefault = chosenDefault
        ? restoredLib.find(l => l.name === chosenDefault)
        : null

      if (matchingDefault) {
        setLayout(matchingDefault.layout.map((item: any) => ({
          ...item,
          minH: 1,
          minW: 1,
          maxH: undefined,
          maxW: undefined,
        })))
        setRightWidgets(matchingDefault.widgets)
      } else {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed?.layout && Array.isArray(parsed.layout)) {
            setLayout(parsed.layout.map((item: any) => ({
              ...item,
              minH: 1,
              minW: 1,
              maxH: undefined,
              maxW: undefined,
            })))
          }
          if (parsed?.rightWidgets && Array.isArray(parsed.rightWidgets)) {
            setRightWidgets(parsed.rightWidgets)
          }
        }
      }
    } catch { /* ignore corrupt storage */ }
    setHasHydrated(true)
  }, [])

  // Save the LIVE layout on every change (only after hydration)
  useEffect(() => {
    if (!hasHydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ layout, rightWidgets }))
    } catch { /* quota / private mode */ }
  }, [layout, rightWidgets, hasHydrated])

  // Persist the saved-layouts library on every change (only after hydration)
  useEffect(() => {
    if (!hasHydrated) return
    try {
      localStorage.setItem(SAVED_LAYOUTS_KEY, JSON.stringify(savedLayouts))
    } catch { /* quota / private mode */ }
  }, [savedLayouts, hasHydrated])

  // Persist the chosen default name (only after hydration)
  useEffect(() => {
    if (!hasHydrated) return
    try {
      if (defaultLayoutName) {
        localStorage.setItem(DEFAULT_LAYOUT_NAME_KEY, defaultLayoutName)
      } else {
        localStorage.removeItem(DEFAULT_LAYOUT_NAME_KEY)
      }
    } catch { /* quota / private mode */ }
  }, [defaultLayoutName, hasHydrated])

  // Persist the per-widget collapsed map so collapses survive refresh
  useEffect(() => {
    if (!hasHydrated) return
    try {
      if (Object.keys(collapsedHeights).length > 0) {
        localStorage.setItem(COLLAPSED_KEY, JSON.stringify(collapsedHeights))
      } else {
        localStorage.removeItem(COLLAPSED_KEY)
      }
    } catch { /* quota / private mode */ }
  }, [collapsedHeights, hasHydrated])

  // Mark a saved layout as the user's default (loads on every refresh).
  // Pass null to clear.
  const setAsDefault = (name: string | null) => {
    setDefaultLayoutName(name)
  }

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

  // Delete a saved layout (and clear it as default if it was)
  const deleteSavedLayout = (name: string) => {
    setSavedLayouts(prev => prev.filter(l => l.name !== name))
    if (defaultLayoutName === name) setDefaultLayoutName(null)
  }

  // Reset to system default layout, clear persisted storage AND drop any
  // saved-as-default pin (so System Default actually wins on next refresh).
  const resetLayout = () => {
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
    setLayout(DEFAULT_LAYOUT)
    setRightWidgets(DEFAULT_RIGHT_WIDGETS)
    setDefaultLayoutName(null)
    setShowLayoutMenu(false)
  }

  // No-op: widget visibility changes are in-memory only
  useEffect(() => {
    // TODO: persist rightWidgets to Supabase when template saving is implemented
  }, [rightWidgets])

  const removeWidget = (id: string) => {
    setRightWidgets(w => w.filter(x => x.id !== id))
    setLayout(l => l.filter(x => x.i !== id))
    // Drop any collapse state for the removed widget
    setCollapsedHeights(prev => {
      if (!(id in prev)) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  // Toggle a widget between collapsed (header-only) and its prior height.
  // Collapse: stash the current `h` in collapsedHeights, set layout `h` to
  // COLLAPSED_H. Expand: restore the saved `h` and clear the entry.
  // Layout compaction (vertical) handles re-flowing neighbors automatically.
  const toggleCollapse = (id: string) => {
    setLayout(prevLayout => {
      const item = prevLayout.find(l => l.i === id)
      if (!item) return prevLayout
      if (id in collapsedHeights) {
        const restoredH = collapsedHeights[id]
        setCollapsedHeights(prev => {
          const next = { ...prev }
          delete next[id]
          return next
        })
        return prevLayout.map(l => (l.i === id ? { ...l, h: restoredH } : l))
      } else {
        setCollapsedHeights(prev => ({ ...prev, [id]: item.h }))
        return prevLayout.map(l => (l.i === id ? { ...l, h: COLLAPSED_H } : l))
      }
    })
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
    () => layout
      .filter(l => rightWidgets.some(w => w.id === l.i))
      .map(l => l.h <= COLLAPSED_H
        // Lock resize on collapsed widgets so users can't drag-resize an
        // empty body. They can still expand via the chevron, then resize.
        ? { ...l, isResizable: false }
        : l
      ),
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
    // Combo widgets — wrap related panels in one cell
    if (widget.type === 'dark-pool-combo') return <DarkPoolCombo ticker={selectedTicker} />
    if (widget.type === 'options-combo')   return <OptionsCombo ticker={selectedTicker} />
    if (widget.type === 'levels-combo')    return <LevelsCombo ticker={selectedTicker} />
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

          {/* Commodities — oil, gas, metals, ag (ETF proxies) */}
          <div className="px-2 pt-3 pb-0.5 border-t border-border/30 mt-2">
            <span className="text-[9px] font-mono font-bold tracking-widest uppercase text-muted-foreground">
              COMMODITIES
            </span>
          </div>
          <CommoditiesPills onSelectTicker={onSelectTicker} />

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
                        {savedLayouts.map(saved => {
                          const isDefault = saved.name === defaultLayoutName
                          return (
                            <div key={saved.name} className="flex items-center gap-1 px-3 py-1.5 border-b border-border hover:bg-muted/20">
                              <button
                                onClick={() => setAsDefault(isDefault ? null : saved.name)}
                                className={isDefault ? 'text-amber-400' : 'text-muted-foreground hover:text-amber-400'}
                                title={isDefault ? 'Default layout — loads on every refresh. Click to unset.' : 'Set as default — load this layout on every refresh.'}
                              >
                                <Star className={`w-2.5 h-2.5 ${isDefault ? 'fill-amber-400' : ''}`} />
                              </button>
                              <button
                                onClick={() => { loadSavedLayout(saved); setShowLayoutMenu(false) }}
                                className="flex-1 text-left text-[10px] font-mono hover:text-primary"
                              >
                                {saved.name}
                                {isDefault && <span className="ml-1.5 text-[8px] text-amber-400">DEFAULT</span>}
                              </button>
                              <button
                                onClick={() => deleteSavedLayout(saved.name)}
                                className="text-muted-foreground hover:text-red-400"
                                title="Delete saved layout"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          )
                        })}
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

        {/* Grid — resize handle CSS lives in app/globals.css.
            Handles are positioned INSIDE each widget's bounds (not outside),
            so they can never be clipped by overflow:auto on this wrapper or
            eaten by neighboring widgets. Every widget is resizable from all
            8 sides regardless of its position in the grid. */}
        <div ref={wrapperRef} className={`flex-1 overflow-y-auto overflow-x-hidden widget-scroll ${isEditMode ? '' : 'rgl-locked'}`}>
          <GridLayout
            className="layout"
            layout={visibleLayout}
            cols={24}
            rowHeight={rowHeight}
            // 2px margin between widgets (matches the working
            // stock-market-analysis-app reference). The tiny gap is
            // critical: it gives every resize handle clean airspace
            // around the widget edge instead of placing handles inside
            // a neighbor's body. With margin=[0,0] (flush) the
            // neighbor's body wins every click on the shared boundary
            // — handles render but are completely unreachable. 2px is
            // small enough that widgets still feel flush visually but
            // big enough that all 8 resize handles work on every
            // widget, every row, every time.
            margin={[2, 2]}
            containerPadding={[0, 0]}
            isDraggable={isEditMode}
            isResizable={isEditMode}
            resizeHandles={['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se']}
            draggableHandle=".widget-drag-handle"
            // Free-form, no-overlap positioning (the user's stated rules):
            //   compactType={null}      — widgets stay exactly where placed
            //                             (no auto-pack toward top of column).
            //                             Place anything anywhere on the grid.
            //   preventCollision={true} — drags / resizes that would overlap
            //                             a neighbor are blocked. Only rule.
            // Combined with margin=[2,2] above, every widget is freely
            // movable and resizable from all 4 corners + all 4 edges,
            // and overlap is the single enforced constraint.
            compactType={null}
            preventCollision={true}
            onLayoutChange={(newLayout: any) => {
              setLayout(newLayout)
            }}
            width={wrapperWidth}
          >
            {rightWidgets.map(widget => {
              const layoutItem = layout.find((l: any) => l.i === widget.id)
              // Local boolean — also covers the case where layout `h` equals
              // COLLAPSED_H but no entry exists in the map (e.g. fresh load).
              const isCollapsed = !!layoutItem && layoutItem.h <= COLLAPSED_H
              return (
                <div
                  key={widget.id}
                  className={`h-full bg-card border border-border flex flex-col relative ${isEditMode ? 'ring-2 ring-primary/30' : ''}`}
                >
                  {/* Widget header / drag bar */}
                  <div className={`widget-drag-handle flex items-center justify-between px-2 py-1 border-b border-border/50 bg-muted/30 ${isEditMode ? 'cursor-grab' : ''}`}>
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isEditMode && <GripVertical className="w-3 h-3 text-green-500 shrink-0" />}
                      <span className="text-[10px] font-mono font-bold uppercase text-muted-foreground truncate">
                        {widget.title}
                      </span>
                      {/* Show ticker in header for all widgets except company-profile (redundant there) */}
                      {selectedTicker && widget.type !== 'company-profile' && widget.type !== 'watchlist' && widget.type !== 'news' && widget.type !== 'trade-ideas' && widget.type !== 'market-overview' && (
                        <span className="text-[9px] font-mono text-primary/70 shrink-0">— {selectedTicker}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Collapse / expand button — always visible */}
                      <button
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); toggleCollapse(widget.id) }}
                        className="text-muted-foreground hover:text-primary"
                        title={isCollapsed ? 'Expand' : 'Collapse to header'}
                      >
                        {isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                      </button>
                      {isEditMode && (
                        <button
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => { e.stopPropagation(); removeWidget(widget.id) }}
                          className="text-muted-foreground hover:text-red-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Widget content — hidden entirely when collapsed so it
                      truly disappears (not just visually clipped). */}
                  {!isCollapsed && (
                    <div className="flex-1 min-h-0 overflow-auto">
                      <WidgetErrorBoundary widgetName={widget.title}>
                        {renderRight(widget)}
                      </WidgetErrorBoundary>
                    </div>
                  )}
                </div>
              )
            })}
          </GridLayout>
        </div>
      </div>
    </div>
  )
}
