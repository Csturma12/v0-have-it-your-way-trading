'use client'

import { useState } from 'react'
import { KeyLevels } from './key-levels'
import { SupportResistance } from './support-resistance'
import { GexLevels } from './gex-levels'
import { Layers, Anchor, Zap } from 'lucide-react'

type LevelsTab = 'key' | 'sr' | 'gex'

/**
 * Levels combo widget.
 *
 * Unified "where will price react?" widget combining the three previously
 * separate level widgets:
 *
 *   - Key Levels   → pivots / VWAP / HOD-LOD (price-action levels)
 *   - S & R        → algorithmic support/resistance from price history
 *   - GEX / Max Pain → options-derived gamma & max-pain levels
 *
 * Tabbed (not side-by-side) because each panel benefits from full widget
 * width, and only the active tab mounts → no extra API calls vs the old
 * three-widget setup, in fact slightly fewer because inactive tabs don't
 * keep their intervals running.
 */
export function LevelsCombo({ ticker }: { ticker: string }) {
  const [tab, setTab] = useState<LevelsTab>('key')

  const tabs: Array<{ id: LevelsTab; label: string; icon: typeof Layers; title: string }> = [
    { id: 'key', label: 'Key Levels', icon: Anchor,  title: 'Pivots / VWAP / HOD-LOD' },
    { id: 'sr',  label: 'S & R',      icon: Layers,  title: 'Algorithmic support & resistance' },
    { id: 'gex', label: 'GEX',        icon: Zap,     title: 'Gamma exposure & max pain' },
  ]

  return (
    <div className="h-full w-full flex flex-col">
      {/* Tab bar */}
      <div className="flex items-center border-b border-border/40 flex-shrink-0">
        {tabs.map(t => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              title={t.title}
              className={`flex-1 flex items-center justify-center gap-1 py-1 text-[9px] font-mono uppercase tracking-wider transition-colors ${
                active
                  ? 'text-foreground bg-muted/40 border-b border-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/20 border-b border-transparent'
              }`}
            >
              <Icon className="w-2.5 h-2.5" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Active panel — only one mounts at a time */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === 'key' && <KeyLevels ticker={ticker} />}
        {tab === 'sr'  && <SupportResistance ticker={ticker} />}
        {tab === 'gex' && <GexLevels ticker={ticker} />}
      </div>
    </div>
  )
}
