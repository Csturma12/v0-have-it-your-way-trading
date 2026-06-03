'use client'

import { useAlpacaTradeUpdates, AlpacaTradeUpdate } from '@/hooks/useAlpacaTradeUpdates'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Activity, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react'

interface AlpacaTradeUpdatesProps {
  className?: string
  maxHeight?: string
  maxUpdates?: number
  onTradeUpdate?: (update: AlpacaTradeUpdate) => void
}

export function AlpacaTradeUpdates({ 
  className, 
  maxHeight = '400px',
  maxUpdates = 50,
  onTradeUpdate 
}: AlpacaTradeUpdatesProps) {
  const { isConnected, updates: allUpdates } = useAlpacaTradeUpdates({
    onTradeUpdate,
    enabled: true,
  })
  
  const updates = allUpdates.slice(0, maxUpdates)

  const getEventIcon = (event: string) => {
    switch (event) {
      case 'fill':
      case 'partial_fill':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'canceled':
      case 'expired':
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'new':
      case 'accepted':
      case 'pending_new':
        return <Clock className="h-4 w-4 text-blue-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    }
  }

  const getEventBadgeVariant = (event: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (event) {
      case 'fill':
        return 'default'
      case 'partial_fill':
        return 'secondary'
      case 'canceled':
      case 'rejected':
      case 'expired':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const formatTime = (timestamp: string | undefined) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    })
  }

  const formatPrice = (price: string | null | undefined) => {
    if (!price) return '-'
    return `$${parseFloat(price).toFixed(2)}`
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Trade Updates
          </CardTitle>
          <Badge variant={isConnected ? 'default' : 'secondary'} className="text-xs">
            {isConnected ? 'Live' : 'Disconnected'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea style={{ maxHeight }} className="pr-4">
          {updates.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 text-sm">
              {isConnected 
                ? 'Waiting for trade updates...' 
                : 'Connect to see real-time updates'}
            </div>
          ) : (
            <div className="space-y-3">
              {updates.map((update, i) => (
                <div 
                  key={`${update.order.id}-${update.event}-${i}`}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border"
                >
                  <div className="mt-0.5">
                    {getEventIcon(update.event)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-semibold text-sm">
                        {update.order.symbol}
                      </span>
                      <Badge variant={getEventBadgeVariant(update.event)} className="text-xs">
                        {update.event.replace(/_/g, ' ')}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          'text-xs',
                          update.order.side === 'buy' ? 'text-green-600' : 'text-red-600'
                        )}
                      >
                        {update.order.side.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      <div className="flex gap-4">
                        <span>Qty: {update.qty || update.order.qty}</span>
                        {update.price && <span>Price: {formatPrice(update.price)}</span>}
                        {update.order.filled_avg_price && (
                          <span>Avg: {formatPrice(update.order.filled_avg_price)}</span>
                        )}
                      </div>
                      <div className="flex gap-4">
                        <span>Filled: {update.order.filled_qty}/{update.order.qty}</span>
                        <span>Status: {update.order.status}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTime(update.timestamp || update.order.updated_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
