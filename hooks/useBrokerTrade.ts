import { useState } from 'react'

interface TradeExecutionParams {
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

export function useBrokerTrade(broker: 'alpaca' | 'tastytrade' | 'ibkr' = 'alpaca') {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TradeResult | null>(null)

  const executeTrade = async (params: TradeExecutionParams): Promise<TradeResult> => {
    setLoading(true)
    setResult(null)

    try {
      const endpoint =
        broker === 'alpaca' ? '/api/alpaca/paper-trade' : `/api/${broker}/paper-trade`

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        const error = await response.json()
        const tradeResult: TradeResult = {
          success: false,
          message: `Trade failed: ${error.error}`,
          error: error.error,
        }
        setResult(tradeResult)
        return tradeResult
      }

      const data = await response.json()
      const tradeResult: TradeResult = {
        success: data.success,
        orderId: data.orderId,
        message: data.message || `${params.side.toUpperCase()} order placed for ${params.quantity} ${params.ticker}`,
      }
      setResult(tradeResult)
      return tradeResult
    } catch (error) {
      const tradeResult: TradeResult = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to execute trade',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
      setResult(tradeResult)
      return tradeResult
    } finally {
      setLoading(false)
    }
  }

  const getAccounts = async () => {
    try {
      const endpoint = broker === 'alpaca' ? '/api/alpaca/accounts' : `/api/${broker}/accounts`
      const response = await fetch(endpoint)
      if (!response.ok) throw new Error('Failed to fetch accounts')
      return await response.json()
    } catch (error) {
      console.error('Error fetching accounts:', error)
      return null
    }
  }

  return { executeTrade, getAccounts, loading, result }
}
