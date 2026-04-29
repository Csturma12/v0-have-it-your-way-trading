'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

type TradingMode = 'autonomous' | 'manual'
type Broker = 'alpaca' | 'tastytrade' | 'ibkr' | 'schwab' | null

interface BrokerConnection {
  broker: Broker
  connected: boolean
  paperTrading: boolean
  accountId?: string
  balance?: number
  buyingPower?: number
}

interface TradingContextType {
  // Trading mode
  mode: TradingMode
  setMode: (mode: TradingMode) => void
  
  // Active broker
  activeBroker: BrokerConnection
  setActiveBroker: (broker: BrokerConnection) => void
  
  // Active ticker (for nav search)
  activeTicker: string
  setActiveTicker: (ticker: string) => void

  // Execute trade helper
  executeTrade: (params: TradeParams) => Promise<TradeResult>
  
  // Loading state
  isExecuting: boolean
  lastTradeResult: TradeResult | null
}

interface TradeParams {
  ticker: string
  side: 'buy' | 'sell'
  quantity: number
  orderType?: 'market' | 'limit' | 'stop'
  limitPrice?: number
  stopPrice?: number
}

interface TradeResult {
  success: boolean
  orderId?: string
  message: string
  error?: string
}

const TradingContext = createContext<TradingContextType | undefined>(undefined)

export function TradingProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<TradingMode>('manual')
  const [isExecuting, setIsExecuting] = useState(false)
  const [lastTradeResult, setLastTradeResult] = useState<TradeResult | null>(null)
  const [activeTicker, setActiveTicker] = useState<string>('AAPL')
  const [activeBroker, setActiveBroker] = useState<BrokerConnection>({
    broker: 'alpaca',
    connected: true,
    paperTrading: true,
  })

  const executeTrade = useCallback(async (params: TradeParams): Promise<TradeResult> => {
    // In manual mode, just log and return success
    if (mode === 'manual') {
      const result: TradeResult = {
        success: true,
        message: `[Manual] ${params.side.toUpperCase()} ${params.quantity} shares of ${params.ticker} logged`,
      }
      setLastTradeResult(result)
      return result
    }

    // In autonomous mode, execute via broker API
    if (!activeBroker.connected || !activeBroker.broker) {
      const result: TradeResult = {
        success: false,
        message: 'No broker connected',
        error: 'Please connect a broker in Settings > Integrations',
      }
      setLastTradeResult(result)
      return result
    }

    setIsExecuting(true)
    setLastTradeResult(null)

    try {
      const endpoint = `/api/${activeBroker.broker}/paper-trade`
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        const error = await response.json()
        const result: TradeResult = {
          success: false,
          message: `Trade failed: ${error.error}`,
          error: error.error,
        }
        setLastTradeResult(result)
        return result
      }

      const data = await response.json()
      const result: TradeResult = {
        success: data.success,
        orderId: data.orderId,
        message: data.message || `${params.side.toUpperCase()} order placed for ${params.quantity} ${params.ticker}`,
      }
      setLastTradeResult(result)
      return result
    } catch (error) {
      const result: TradeResult = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to execute trade',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
      setLastTradeResult(result)
      return result
    } finally {
      setIsExecuting(false)
    }
  }, [mode, activeBroker])

  return (
    <TradingContext.Provider
      value={{
        mode,
        setMode,
        activeBroker,
        setActiveBroker,
        activeTicker,
        setActiveTicker,
        executeTrade,
        isExecuting,
        lastTradeResult,
      }}
    >
      {children}
    </TradingContext.Provider>
  )
}

export function useTradingContext() {
  const context = useContext(TradingContext)
  if (context === undefined) {
    throw new Error('useTradingContext must be used within a TradingProvider')
  }
  return context
}
