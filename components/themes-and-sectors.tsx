'use client'

import { CrossSectorThemes } from './cross-sector-themes'
import { SectorCards } from './sector-cards'

interface ThemesAndSectorsProps {
  onSelectTheme?: (tickers: string[]) => void
}

export function ThemesAndSectors({ onSelectTheme }: ThemesAndSectorsProps) {
  return (
    <div className="w-full space-y-12">
      {/* Themes Section */}
      <div>
        <CrossSectorThemes onSelectTheme={onSelectTheme} />
      </div>

      {/* Divider */}
      <div className="border-t border-border/30" />

      {/* Sectors Section */}
      <div>
        <SectorCards />
      </div>
    </div>
  )
}
