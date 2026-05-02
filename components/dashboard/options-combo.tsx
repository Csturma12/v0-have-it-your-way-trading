'use client'

import { useState } from 'react'
import { OptionsChain } from './options-chain'
import { OptionsFlow } from './options-flow'
import { LineChart, Activity } from 'lucide-react'

type OptionsView = 'chain' | 'flow'

/**
 * Options combo widget.
 *
 * Renders the Options Chain and Options Flow as a single widget with a
 * toggle (like ThinkOrSwim's "Trade" tab). Only the active view is
 * mounted — the inactive one unmounts and stops fetching, so this
 * REDUCES API calls vs having both widgets always-on.
 *
 * Side-by-side was rejected because chains are wide tables that need
 * the full widget width to remain readable.
 */
export function OptionsCombo({ ticker }: { ticker: string }) {
  const [view, setView] = useState<OptionsView>('chain')

  return (
    <div className="h-full w-full flex flex-col">
      {/* Toggle bar */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-border/40 flex-shrink-0">
        <button
          onClick={() => setView('chain')}
          className={`flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider rounded transition-colors ${
            view === 'chain'
              ? 'bg-primary/15 text-primary border border-primary/30'
              : 'text-muted-foreground hover:text-foreground border border-transparent'
          }`}
          title="Options chain — strikes, IV, OI, volume"
        >
          <LineChart className="w-2.5 h-2.5" />
          Chain
        </button>
        <button
          onClick={() => setView('flow')}
          className={`flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider rounded transition-colors ${
            view === 'flow'
              ? 'bg-primary/15 text-primary border border-primary/30'
              : 'text-muted-foreground hover:text-foreground border border-transparent'
          }`}
          title="Options flow — live unusual orders & sweeps"
        >
          <Activity className="w-2.5 h-2.5" />
          Flow
        </button>
      </div>

      {/* Active view — only one mounts at a time */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {view === 'chain' ? (
          <OptionsChain ticker={ticker} />
        ) : (
          <OptionsFlow ticker={ticker} />
        )}
      </div>
    </div>
  )
}
