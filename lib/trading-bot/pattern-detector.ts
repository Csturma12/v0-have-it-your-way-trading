/**
 * Pattern Detection Engine
 * Detects technical patterns, price action patterns, and AI signals
 */

import type { Indicators } from '@/hooks/useTechnicalIndicators'

// ===========================================
// TYPES
// ===========================================

export interface Pattern {
  id: string
  name: string
  type: 'technical' | 'price_action' | 'ai_signal' | 'custom'
  criteria: PatternCriteria
  base_confidence: number
  is_active: boolean
}

export interface PatternCriteria {
  indicator?: string
  condition?: string
  threshold?: number
  pattern?: string
  require_volume?: boolean
  require_momentum?: boolean
  sources?: string[]
  min_score?: number
  action?: string
  require_ai_signal?: boolean
  require_technical?: boolean
  min_combined_score?: number
}

export interface Signal {
  ticker: string
  signal_type: 'technical' | 'ai_claude' | 'ai_openai' | 'pattern' | 'price_action'
  signal_name: string
  direction: 'bullish' | 'bearish' | 'neutral'
  strength: number
  price_at_signal: number
  indicator_values: Record<string, unknown>
  pattern_id?: string
  timestamp: Date
}

export interface AITradeIdea {
  ticker: string
  action: 'buy' | 'sell' | 'hold'
  confidence: number
  source: 'claude' | 'openai'
  priceTarget?: number
  currentPrice?: number
}

export interface DetectionResult {
  signals: Signal[]
  recommendations: TradeRecommendation[]
  timestamp: Date
}

export interface TradeRecommendation {
  ticker: string
  action: 'buy' | 'sell'
  confidence: number
  signals: Signal[]
  reasoning: string[]
  suggestedQuantity?: number
  suggestedPrice?: number
}

// ===========================================
// TECHNICAL PATTERN DETECTION
// ===========================================

export function detectTechnicalPatterns(
  ticker: string,
  indicators: Indicators,
  price: number,
  patterns: Pattern[]
): Signal[] {
  const signals: Signal[] = []
  const activePatterns = patterns.filter(p => p.is_active && p.type === 'technical')

  for (const pattern of activePatterns) {
    const signal = evaluateTechnicalPattern(ticker, indicators, price, pattern)
    if (signal) {
      signals.push(signal)
    }
  }

  return signals
}

function evaluateTechnicalPattern(
  ticker: string,
  indicators: Indicators,
  price: number,
  pattern: Pattern
): Signal | null {
  const { criteria } = pattern

  // RSI patterns
  if (criteria.indicator === 'rsi' && indicators.RSI) {
    const rsi = indicators.RSI
    
    if (criteria.condition === 'crosses_above' && rsi.value > (criteria.threshold || 30) && rsi.oversold) {
      return {
        ticker,
        signal_type: 'technical',
        signal_name: pattern.name,
        direction: 'bullish',
        strength: Math.min(100, pattern.base_confidence + (30 - rsi.value) * 2),
        price_at_signal: price,
        indicator_values: { rsi: rsi.value },
        pattern_id: pattern.id,
        timestamp: new Date()
      }
    }
    
    if (criteria.condition === 'crosses_below' && rsi.value < (criteria.threshold || 70) && rsi.overbought) {
      return {
        ticker,
        signal_type: 'technical',
        signal_name: pattern.name,
        direction: 'bearish',
        strength: Math.min(100, pattern.base_confidence + (rsi.value - 70) * 2),
        price_at_signal: price,
        indicator_values: { rsi: rsi.value },
        pattern_id: pattern.id,
        timestamp: new Date()
      }
    }
  }

  // MACD patterns
  if (criteria.indicator === 'macd' && indicators.MACD) {
    const macd = indicators.MACD
    
    if (criteria.condition === 'bullish_cross' && macd.crossover === 'bullish') {
      return {
        ticker,
        signal_type: 'technical',
        signal_name: pattern.name,
        direction: 'bullish',
        strength: Math.min(100, pattern.base_confidence + Math.abs(macd.histogram) * 10),
        price_at_signal: price,
        indicator_values: { macd: macd.macd, signal: macd.signal, histogram: macd.histogram },
        pattern_id: pattern.id,
        timestamp: new Date()
      }
    }
    
    if (criteria.condition === 'bearish_cross' && macd.crossover === 'bearish') {
      return {
        ticker,
        signal_type: 'technical',
        signal_name: pattern.name,
        direction: 'bearish',
        strength: Math.min(100, pattern.base_confidence + Math.abs(macd.histogram) * 10),
        price_at_signal: price,
        indicator_values: { macd: macd.macd, signal: macd.signal, histogram: macd.histogram },
        pattern_id: pattern.id,
        timestamp: new Date()
      }
    }
  }

  // Bollinger Band patterns
  if (criteria.indicator === 'bollinger' && indicators.BBANDS) {
    const bb = indicators.BBANDS
    
    if (criteria.condition === 'squeeze_breakout') {
      // Squeeze when bandwidth is low, breakout when price breaks upper/lower band
      const isSqueezing = bb.bandwidth < 0.1
      const breakingUpper = price > bb.upper
      const breakingLower = price < bb.lower
      
      if (isSqueezing && breakingUpper) {
        return {
          ticker,
          signal_type: 'technical',
          signal_name: pattern.name,
          direction: 'bullish',
          strength: Math.min(100, pattern.base_confidence + 15),
          price_at_signal: price,
          indicator_values: { upper: bb.upper, lower: bb.lower, bandwidth: bb.bandwidth },
          pattern_id: pattern.id,
          timestamp: new Date()
        }
      }
      
      if (isSqueezing && breakingLower) {
        return {
          ticker,
          signal_type: 'technical',
          signal_name: pattern.name,
          direction: 'bearish',
          strength: Math.min(100, pattern.base_confidence + 15),
          price_at_signal: price,
          indicator_values: { upper: bb.upper, lower: bb.lower, bandwidth: bb.bandwidth },
          pattern_id: pattern.id,
          timestamp: new Date()
        }
      }
    }
  }

  return null
}

// ===========================================
// AI SIGNAL DETECTION
// ===========================================

export function detectAISignals(
  ticker: string,
  claudeIdeas: AITradeIdea[],
  openaiIdeas: AITradeIdea[],
  price: number,
  patterns: Pattern[]
): Signal[] {
  const signals: Signal[] = []

  // Find ideas for this ticker
  const claudeIdea = claudeIdeas.find(i => i.ticker === ticker)
  const openaiIdea = openaiIdeas.find(i => i.ticker === ticker)

  // Claude signal
  if (claudeIdea && claudeIdea.action !== 'hold' && claudeIdea.confidence >= 70) {
    signals.push({
      ticker,
      signal_type: 'ai_claude',
      signal_name: `Claude ${claudeIdea.action.toUpperCase()} Signal`,
      direction: claudeIdea.action === 'buy' ? 'bullish' : 'bearish',
      strength: claudeIdea.confidence,
      price_at_signal: price,
      indicator_values: { 
        action: claudeIdea.action, 
        confidence: claudeIdea.confidence,
        priceTarget: claudeIdea.priceTarget 
      },
      timestamp: new Date()
    })
  }

  // OpenAI signal
  if (openaiIdea && openaiIdea.action !== 'hold' && openaiIdea.confidence >= 70) {
    signals.push({
      ticker,
      signal_type: 'ai_openai',
      signal_name: `OpenAI ${openaiIdea.action.toUpperCase()} Signal`,
      direction: openaiIdea.action === 'buy' ? 'bullish' : 'bearish',
      strength: openaiIdea.confidence,
      price_at_signal: price,
      indicator_values: { 
        action: openaiIdea.action, 
        confidence: openaiIdea.confidence,
        priceTarget: openaiIdea.priceTarget 
      },
      timestamp: new Date()
    })
  }

  // Check for AI consensus patterns
  const aiConsensusPatterns = patterns.filter(p => p.type === 'ai_signal' && p.is_active)
  
  for (const pattern of aiConsensusPatterns) {
    if (claudeIdea && openaiIdea) {
      const { criteria } = pattern
      const minScore = criteria.min_score || 80
      
      // Both agree on action with high confidence
      if (
        claudeIdea.action === openaiIdea.action &&
        claudeIdea.action === criteria.action &&
        claudeIdea.confidence >= minScore &&
        openaiIdea.confidence >= minScore
      ) {
        const avgConfidence = (claudeIdea.confidence + openaiIdea.confidence) / 2
        signals.push({
          ticker,
          signal_type: 'pattern',
          signal_name: pattern.name,
          direction: criteria.action === 'buy' ? 'bullish' : 'bearish',
          strength: Math.min(100, avgConfidence + 10), // Bonus for consensus
          price_at_signal: price,
          indicator_values: {
            claudeConfidence: claudeIdea.confidence,
            openaiConfidence: openaiIdea.confidence,
            consensus: true
          },
          pattern_id: pattern.id,
          timestamp: new Date()
        })
      }
    }
  }

  return signals
}

// ===========================================
// GENERATE TRADE RECOMMENDATIONS
// ===========================================

export function generateRecommendations(
  signals: Signal[],
  minConfidence: number = 70
): TradeRecommendation[] {
  const recommendations: TradeRecommendation[] = []
  
  // Group signals by ticker
  const signalsByTicker = signals.reduce((acc, signal) => {
    if (!acc[signal.ticker]) acc[signal.ticker] = []
    acc[signal.ticker].push(signal)
    return acc
  }, {} as Record<string, Signal[]>)

  for (const [ticker, tickerSignals] of Object.entries(signalsByTicker)) {
    // Calculate weighted confidence
    const bullishSignals = tickerSignals.filter(s => s.direction === 'bullish')
    const bearishSignals = tickerSignals.filter(s => s.direction === 'bearish')

    const bullishScore = bullishSignals.reduce((sum, s) => sum + s.strength, 0) / Math.max(1, bullishSignals.length)
    const bearishScore = bearishSignals.reduce((sum, s) => sum + s.strength, 0) / Math.max(1, bearishSignals.length)

    // Add bonus for multiple confirming signals
    const bullishBonus = Math.min(20, bullishSignals.length * 5)
    const bearishBonus = Math.min(20, bearishSignals.length * 5)

    const finalBullishScore = bullishScore + bullishBonus
    const finalBearishScore = bearishScore + bearishBonus

    // Generate recommendation if confidence is high enough
    if (finalBullishScore >= minConfidence && finalBullishScore > finalBearishScore) {
      recommendations.push({
        ticker,
        action: 'buy',
        confidence: Math.round(finalBullishScore),
        signals: bullishSignals,
        reasoning: bullishSignals.map(s => `${s.signal_name}: ${s.strength}% confidence`)
      })
    } else if (finalBearishScore >= minConfidence && finalBearishScore > finalBullishScore) {
      recommendations.push({
        ticker,
        action: 'sell',
        confidence: Math.round(finalBearishScore),
        signals: bearishSignals,
        reasoning: bearishSignals.map(s => `${s.signal_name}: ${s.strength}% confidence`)
      })
    }
  }

  // Sort by confidence
  return recommendations.sort((a, b) => b.confidence - a.confidence)
}

// ===========================================
// MAIN DETECTION FUNCTION
// ===========================================

export async function runPatternDetection(
  tickers: string[],
  indicatorsMap: Record<string, Indicators>,
  pricesMap: Record<string, number>,
  claudeIdeas: AITradeIdea[],
  openaiIdeas: AITradeIdea[],
  patterns: Pattern[],
  minConfidence: number = 70
): Promise<DetectionResult> {
  const allSignals: Signal[] = []

  for (const ticker of tickers) {
    const indicators = indicatorsMap[ticker]
    const price = pricesMap[ticker]

    if (!price) continue

    // Detect technical patterns
    if (indicators) {
      const technicalSignals = detectTechnicalPatterns(ticker, indicators, price, patterns)
      allSignals.push(...technicalSignals)
    }

    // Detect AI signals
    const aiSignals = detectAISignals(ticker, claudeIdeas, openaiIdeas, price, patterns)
    allSignals.push(...aiSignals)
  }

  // Generate recommendations
  const recommendations = generateRecommendations(allSignals, minConfidence)

  return {
    signals: allSignals,
    recommendations,
    timestamp: new Date()
  }
}
