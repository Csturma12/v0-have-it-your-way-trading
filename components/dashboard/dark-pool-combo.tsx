'use client'

import { DarkPoolBlocks } from './dark-pool-blocks'
import { DarkPoolFlow } from './dark-pool-flow'

/**
 * Dark Pool combo widget.
 *
 * Renders Dark Pool / Blocks (cross-market prints from /api/dark-pool) and
 * Dark Pool Flow (per-ticker prints from useTickerBundle) side-by-side.
 *
 * Each child still calls its own APIs independently — this is a pure UI
 * wrapper, no extra requests are made and the existing per-widget caches
 * are reused.
 *
 * On narrow widget widths (< 480px) we stack vertically so neither table
 * gets squished into unreadable territory.
 */
export function DarkPoolCombo({ ticker }: { ticker: string | null }) {
  return (
    <div className="h-full w-full flex flex-col @container">
      <div className="flex-1 grid grid-cols-1 @[480px]:grid-cols-2 min-h-0 divide-x divide-border/40">
        {/* Cross-market block prints (works without a selected ticker) */}
        <div className="min-h-0 min-w-0 overflow-hidden">
          <DarkPoolBlocks ticker={ticker} />
        </div>
        {/* Per-ticker dark pool flow (requires ticker) */}
        <div className="min-h-0 min-w-0 overflow-hidden">
          {ticker ? (
            <DarkPoolFlow ticker={ticker} />
          ) : (
            <div className="h-full flex items-center justify-center text-[10px] font-mono text-muted-foreground p-3 text-center">
              Select a ticker to see per-symbol dark pool flow
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
