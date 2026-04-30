'use client'

import { RefreshCw, AlertCircle, Search } from 'lucide-react'

interface WidgetEmptyStateProps {
  type: 'no-ticker' | 'error' | 'no-data'
  onRetry?: () => void
  message?: string
}

export function WidgetEmptyState({ type, onRetry, message }: WidgetEmptyStateProps) {
  if (type === 'no-ticker') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-1.5 text-muted-foreground px-3 py-4">
        <Search className="w-4 h-4 opacity-40" />
        <span className="text-[9px] font-mono text-center opacity-60">Select a ticker to view data</span>
      </div>
    )
  }

  if (type === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground px-3 py-4">
        <AlertCircle className="w-4 h-4 text-red-400/60" />
        <span className="text-[9px] font-mono text-center text-red-400/80">
          {message || 'Failed to load data'}
        </span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1 text-[8px] font-mono px-2 py-0.5 rounded border border-border hover:border-primary/50 hover:text-primary transition-colors"
          >
            <RefreshCw className="w-2.5 h-2.5" />
            Retry
          </button>
        )}
      </div>
    )
  }

  // no-data
  return (
    <div className="flex flex-col items-center justify-center h-full gap-1.5 text-muted-foreground px-3 py-4">
      <span className="text-[9px] font-mono text-center opacity-50">
        {message || 'No data available'}
      </span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1 text-[8px] font-mono px-2 py-0.5 rounded border border-border hover:border-primary/50 hover:text-primary transition-colors"
        >
          <RefreshCw className="w-2.5 h-2.5" />
          Retry
        </button>
      )}
    </div>
  )
}
