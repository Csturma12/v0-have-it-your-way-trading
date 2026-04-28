/**
 * Risk Manager
 * Enforces position limits, daily loss limits, and exposure controls
 */

export interface RiskLimits {
  max_position_size: number
  max_total_exposure: number
  max_concurrent_positions: number
  daily_loss_limit: number
  max_loss_per_trade: number
  take_profit_percent: number
  stop_loss_percent: number
  trading_start_hour: number
  trading_end_hour: number
  min_confidence_score: number
  current_daily_pnl: number
  last_reset_date: string
}

export interface Position {
  ticker: string
  quantity: number
  entry_price: number
  current_price: number
  unrealized_pnl: number
  status: 'open' | 'pending'
}

export interface RiskCheckResult {
  allowed: boolean
  reason?: string
  adjustedQuantity?: number
  warnings: string[]
}

export class RiskManager {
  private limits: RiskLimits
  private positions: Position[]
  private dailyPnL: number

  constructor(limits: RiskLimits, positions: Position[] = []) {
    this.limits = limits
    this.positions = positions
    this.dailyPnL = limits.current_daily_pnl || 0
  }

  /**
   * Check if a trade is allowed based on all risk parameters
   */
  checkTrade(
    ticker: string,
    side: 'buy' | 'sell',
    quantity: number,
    price: number,
    confidence: number
  ): RiskCheckResult {
    const warnings: string[] = []
    const tradeValue = quantity * price

    // 1. Check trading hours
    if (!this.isWithinTradingHours()) {
      return {
        allowed: false,
        reason: 'Outside trading hours',
        warnings
      }
    }

    // 2. Check minimum confidence
    if (confidence < this.limits.min_confidence_score) {
      return {
        allowed: false,
        reason: `Confidence ${confidence}% below minimum ${this.limits.min_confidence_score}%`,
        warnings
      }
    }

    // 3. Check daily loss limit
    if (this.dailyPnL <= -this.limits.daily_loss_limit) {
      return {
        allowed: false,
        reason: `Daily loss limit reached: $${Math.abs(this.dailyPnL).toFixed(2)}`,
        warnings
      }
    }

    // For buy orders, check additional constraints
    if (side === 'buy') {
      // 4. Check max concurrent positions
      const openPositions = this.positions.filter(p => p.status === 'open')
      if (openPositions.length >= this.limits.max_concurrent_positions) {
        return {
          allowed: false,
          reason: `Max ${this.limits.max_concurrent_positions} concurrent positions reached`,
          warnings
        }
      }

      // 5. Check if already in position for this ticker
      const existingPosition = openPositions.find(p => p.ticker === ticker)
      if (existingPosition) {
        warnings.push(`Already holding ${existingPosition.quantity} shares of ${ticker}`)
      }

      // 6. Check position size limit
      if (tradeValue > this.limits.max_position_size) {
        const adjustedQuantity = Math.floor(this.limits.max_position_size / price)
        if (adjustedQuantity < 1) {
          return {
            allowed: false,
            reason: `Trade value $${tradeValue.toFixed(2)} exceeds position limit $${this.limits.max_position_size}`,
            warnings
          }
        }
        warnings.push(`Quantity reduced from ${quantity} to ${adjustedQuantity} to meet position limit`)
        return {
          allowed: true,
          adjustedQuantity,
          warnings
        }
      }

      // 7. Check total exposure
      const currentExposure = this.calculateTotalExposure()
      if (currentExposure + tradeValue > this.limits.max_total_exposure) {
        const maxAddition = this.limits.max_total_exposure - currentExposure
        const adjustedQuantity = Math.floor(maxAddition / price)
        if (adjustedQuantity < 1) {
          return {
            allowed: false,
            reason: `Would exceed total exposure limit of $${this.limits.max_total_exposure}`,
            warnings
          }
        }
        warnings.push(`Quantity reduced to ${adjustedQuantity} to stay within exposure limit`)
        return {
          allowed: true,
          adjustedQuantity,
          warnings
        }
      }
    }

    // 8. Check max loss per trade
    const potentialLoss = tradeValue * (this.limits.stop_loss_percent / 100)
    if (potentialLoss > this.limits.max_loss_per_trade) {
      const safeQuantity = Math.floor(this.limits.max_loss_per_trade / (price * (this.limits.stop_loss_percent / 100)))
      if (safeQuantity < 1) {
        return {
          allowed: false,
          reason: `Potential loss exceeds max loss per trade of $${this.limits.max_loss_per_trade}`,
          warnings
        }
      }
      warnings.push(`Quantity adjusted to ${safeQuantity} based on max loss per trade`)
      return {
        allowed: true,
        adjustedQuantity: safeQuantity,
        warnings
      }
    }

    // Add warning if close to daily loss limit
    const remainingDailyBudget = this.limits.daily_loss_limit + this.dailyPnL
    if (remainingDailyBudget < potentialLoss) {
      warnings.push(`Warning: Potential loss ($${potentialLoss.toFixed(2)}) exceeds remaining daily budget ($${remainingDailyBudget.toFixed(2)})`)
    }

    return {
      allowed: true,
      warnings
    }
  }

  /**
   * Calculate total current exposure
   */
  calculateTotalExposure(): number {
    return this.positions
      .filter(p => p.status === 'open')
      .reduce((sum, p) => sum + (p.quantity * p.current_price), 0)
  }

  /**
   * Check if within trading hours (EST)
   */
  isWithinTradingHours(): boolean {
    const now = new Date()
    const estHour = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' })).getHours()
    return estHour >= this.limits.trading_start_hour && estHour < this.limits.trading_end_hour
  }

  /**
   * Calculate stop loss price
   */
  calculateStopLoss(entryPrice: number, side: 'buy' | 'sell'): number {
    const stopPercent = this.limits.stop_loss_percent / 100
    return side === 'buy' 
      ? entryPrice * (1 - stopPercent)
      : entryPrice * (1 + stopPercent)
  }

  /**
   * Calculate take profit price
   */
  calculateTakeProfit(entryPrice: number, side: 'buy' | 'sell'): number {
    const tpPercent = this.limits.take_profit_percent / 100
    return side === 'buy'
      ? entryPrice * (1 + tpPercent)
      : entryPrice * (1 - tpPercent)
  }

  /**
   * Update daily P&L
   */
  updateDailyPnL(pnl: number): void {
    this.dailyPnL += pnl
  }

  /**
   * Check if daily P&L needs to be reset
   */
  shouldResetDailyPnL(): boolean {
    const today = new Date().toISOString().split('T')[0]
    return this.limits.last_reset_date !== today
  }

  /**
   * Get current risk status
   */
  getRiskStatus(): {
    dailyPnL: number
    dailyPnLPercent: number
    totalExposure: number
    exposurePercent: number
    openPositions: number
    positionsPercent: number
    canTrade: boolean
    warnings: string[]
  } {
    const totalExposure = this.calculateTotalExposure()
    const openPositions = this.positions.filter(p => p.status === 'open').length
    const warnings: string[] = []

    // Check for warnings
    if (this.dailyPnL <= -this.limits.daily_loss_limit * 0.8) {
      warnings.push('Approaching daily loss limit')
    }
    if (totalExposure >= this.limits.max_total_exposure * 0.8) {
      warnings.push('Approaching max exposure limit')
    }
    if (openPositions >= this.limits.max_concurrent_positions - 1) {
      warnings.push('Approaching max positions limit')
    }
    if (!this.isWithinTradingHours()) {
      warnings.push('Outside trading hours')
    }

    const canTrade = 
      this.dailyPnL > -this.limits.daily_loss_limit &&
      totalExposure < this.limits.max_total_exposure &&
      openPositions < this.limits.max_concurrent_positions &&
      this.isWithinTradingHours()

    return {
      dailyPnL: this.dailyPnL,
      dailyPnLPercent: (this.dailyPnL / this.limits.daily_loss_limit) * -100,
      totalExposure,
      exposurePercent: (totalExposure / this.limits.max_total_exposure) * 100,
      openPositions,
      positionsPercent: (openPositions / this.limits.max_concurrent_positions) * 100,
      canTrade,
      warnings
    }
  }

  /**
   * Update positions
   */
  updatePositions(positions: Position[]): void {
    this.positions = positions
  }

  /**
   * Update limits
   */
  updateLimits(limits: RiskLimits): void {
    this.limits = limits
    this.dailyPnL = limits.current_daily_pnl || 0
  }
}

/**
 * Create default risk limits
 */
export function getDefaultRiskLimits(): RiskLimits {
  return {
    max_position_size: 1000,
    max_total_exposure: 5000,
    max_concurrent_positions: 5,
    daily_loss_limit: 500,
    max_loss_per_trade: 200,
    take_profit_percent: 5,
    stop_loss_percent: 2,
    trading_start_hour: 9,
    trading_end_hour: 16,
    min_confidence_score: 70,
    current_daily_pnl: 0,
    last_reset_date: new Date().toISOString().split('T')[0]
  }
}
