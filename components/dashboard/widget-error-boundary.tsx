'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  widgetName?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Error boundary to isolate widget failures so one broken widget
 * doesn't blank the entire dashboard. Each widget in the grid is
 * wrapped with this so users see a contained error message + retry,
 * not a white screen.
 */
export class WidgetErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      `[v0] Widget "${this.props.widgetName ?? 'unknown'}" crashed:`,
      error,
      errorInfo,
    )
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full flex flex-col items-center justify-center gap-2 p-3 text-center">
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          <div className="text-[10px] font-mono text-muted-foreground">
            Widget failed to render
          </div>
          {this.props.widgetName && (
            <div className="text-[8px] font-mono text-muted-foreground/60">
              ({this.props.widgetName})
            </div>
          )}
          <button
            onClick={this.handleRetry}
            className="mt-1 flex items-center gap-1 px-2 py-1 text-[9px] font-mono border border-border rounded hover:bg-muted/50"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
