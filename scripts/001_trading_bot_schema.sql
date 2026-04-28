-- Trading Bot Knowledge Base Schema
-- This creates tables for pattern storage, trade history, risk management, and bot configuration

-- ============================================
-- 1. PATTERNS KNOWLEDGE BASE
-- ============================================
CREATE TABLE IF NOT EXISTS patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('technical', 'price_action', 'ai_signal', 'custom')),
  description TEXT,
  
  -- Pattern detection criteria (JSON for flexibility)
  criteria JSONB NOT NULL DEFAULT '{}',
  
  -- Performance metrics
  win_rate DECIMAL(5,2) DEFAULT 0,
  avg_return DECIMAL(8,4) DEFAULT 0,
  total_trades INTEGER DEFAULT 0,
  successful_trades INTEGER DEFAULT 0,
  
  -- Pattern confidence scoring weights
  base_confidence INTEGER DEFAULT 50 CHECK (base_confidence >= 0 AND base_confidence <= 100),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. TRADE HISTORY
-- ============================================
CREATE TABLE IF NOT EXISTS trade_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Trade details
  ticker TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  quantity INTEGER NOT NULL,
  entry_price DECIMAL(12,4) NOT NULL,
  exit_price DECIMAL(12,4),
  
  -- Order info
  order_id TEXT,
  order_type TEXT DEFAULT 'market',
  broker TEXT DEFAULT 'alpaca',
  
  -- Pattern that triggered the trade
  pattern_id UUID REFERENCES patterns(id),
  pattern_name TEXT,
  confidence_score INTEGER,
  
  -- Signals that contributed
  signals JSONB DEFAULT '[]',
  
  -- P&L tracking
  realized_pnl DECIMAL(12,4),
  unrealized_pnl DECIMAL(12,4),
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'open', 'closed', 'cancelled', 'failed')),
  
  -- Timestamps
  entry_time TIMESTAMPTZ,
  exit_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. RISK LIMITS
-- ============================================
CREATE TABLE IF NOT EXISTS risk_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Position limits
  max_position_size DECIMAL(12,2) DEFAULT 1000,      -- Max $ per position
  max_total_exposure DECIMAL(12,2) DEFAULT 5000,     -- Max total $ in market
  max_concurrent_positions INTEGER DEFAULT 5,
  
  -- Loss limits
  daily_loss_limit DECIMAL(12,2) DEFAULT 500,        -- Stop trading after this daily loss
  max_loss_per_trade DECIMAL(12,2) DEFAULT 200,      -- Max loss allowed per trade
  
  -- Profit taking
  take_profit_percent DECIMAL(5,2) DEFAULT 5.00,     -- Default take profit %
  stop_loss_percent DECIMAL(5,2) DEFAULT 2.00,       -- Default stop loss %
  
  -- Time constraints
  trading_start_hour INTEGER DEFAULT 9,              -- Market hours (EST)
  trading_end_hour INTEGER DEFAULT 16,
  
  -- Minimum confidence to trade
  min_confidence_score INTEGER DEFAULT 70,
  
  -- Current state
  current_daily_pnl DECIMAL(12,2) DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. BOT CONFIGURATION
-- ============================================
CREATE TABLE IF NOT EXISTS bot_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Bot state
  is_enabled BOOLEAN DEFAULT false,
  mode TEXT DEFAULT 'paper' CHECK (mode IN ('paper', 'live')),
  
  -- Trading preferences
  default_position_size DECIMAL(12,2) DEFAULT 500,
  auto_execute_high_confidence BOOLEAN DEFAULT true,
  follow_ai_recommendations BOOLEAN DEFAULT true,
  
  -- Watchlist for scanning
  watchlist TEXT[] DEFAULT ARRAY['NVDA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA'],
  
  -- Scan frequency (seconds)
  scan_interval INTEGER DEFAULT 60,
  
  -- Notification preferences
  notify_on_trade BOOLEAN DEFAULT true,
  notify_on_signal BOOLEAN DEFAULT true,
  
  -- AI integration settings
  use_claude_signals BOOLEAN DEFAULT true,
  use_openai_signals BOOLEAN DEFAULT true,
  require_consensus BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. SIGNAL LOG (Real-time signals)
-- ============================================
CREATE TABLE IF NOT EXISTS signal_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  ticker TEXT NOT NULL,
  signal_type TEXT NOT NULL,  -- 'technical', 'ai_claude', 'ai_openai', 'pattern'
  signal_name TEXT NOT NULL,
  
  -- Signal details
  direction TEXT CHECK (direction IN ('bullish', 'bearish', 'neutral')),
  strength INTEGER CHECK (strength >= 0 AND strength <= 100),
  
  -- Context
  price_at_signal DECIMAL(12,4),
  indicator_values JSONB DEFAULT '{}',
  
  -- Was it acted upon?
  was_traded BOOLEAN DEFAULT false,
  trade_id UUID REFERENCES trade_history(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. DAILY PERFORMANCE
-- ============================================
CREATE TABLE IF NOT EXISTS daily_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  date DATE NOT NULL UNIQUE,
  
  -- P&L
  realized_pnl DECIMAL(12,4) DEFAULT 0,
  unrealized_pnl DECIMAL(12,4) DEFAULT 0,
  
  -- Trade stats
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  losing_trades INTEGER DEFAULT 0,
  
  -- Pattern performance
  patterns_triggered JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_trade_history_ticker ON trade_history(ticker);
CREATE INDEX IF NOT EXISTS idx_trade_history_status ON trade_history(status);
CREATE INDEX IF NOT EXISTS idx_trade_history_created ON trade_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signal_log_ticker ON signal_log(ticker);
CREATE INDEX IF NOT EXISTS idx_signal_log_created ON signal_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_patterns_type ON patterns(type);
CREATE INDEX IF NOT EXISTS idx_patterns_active ON patterns(is_active);

-- ============================================
-- SEED DEFAULT PATTERNS
-- ============================================
INSERT INTO patterns (name, type, description, criteria, base_confidence) VALUES
  ('RSI Oversold Bounce', 'technical', 'Buy when RSI crosses above 30 from oversold territory', 
   '{"indicator": "rsi", "condition": "crosses_above", "threshold": 30}', 65),
  
  ('RSI Overbought Reversal', 'technical', 'Sell when RSI crosses below 70 from overbought territory',
   '{"indicator": "rsi", "condition": "crosses_below", "threshold": 70}', 65),
  
  ('MACD Bullish Cross', 'technical', 'Buy when MACD line crosses above signal line',
   '{"indicator": "macd", "condition": "bullish_cross"}', 60),
  
  ('MACD Bearish Cross', 'technical', 'Sell when MACD line crosses below signal line',
   '{"indicator": "macd", "condition": "bearish_cross"}', 60),
  
  ('Bollinger Band Squeeze Breakout', 'technical', 'Trade breakout when bands squeeze and price breaks out',
   '{"indicator": "bollinger", "condition": "squeeze_breakout"}', 70),
  
  ('Support Bounce', 'price_action', 'Buy when price bounces off support level with volume',
   '{"pattern": "support_bounce", "require_volume": true}', 55),
  
  ('Resistance Break', 'price_action', 'Buy when price breaks above resistance with momentum',
   '{"pattern": "resistance_break", "require_momentum": true}', 60),
  
  ('AI Consensus Buy', 'ai_signal', 'Buy when both Claude and OpenAI recommend with high confidence',
   '{"sources": ["claude", "openai"], "min_score": 80, "action": "buy"}', 85),
  
  ('AI Consensus Sell', 'ai_signal', 'Sell when both Claude and OpenAI recommend with high confidence',
   '{"sources": ["claude", "openai"], "min_score": 80, "action": "sell"}', 85),
  
  ('High Confidence AI + Technical', 'custom', 'Trade when AI signal aligns with technical pattern',
   '{"require_ai_signal": true, "require_technical": true, "min_combined_score": 75}', 90)
ON CONFLICT DO NOTHING;

-- ============================================
-- SEED DEFAULT RISK LIMITS
-- ============================================
INSERT INTO risk_limits (
  max_position_size,
  max_total_exposure,
  max_concurrent_positions,
  daily_loss_limit,
  max_loss_per_trade,
  take_profit_percent,
  stop_loss_percent,
  min_confidence_score
) VALUES (1000, 5000, 5, 500, 200, 5.00, 2.00, 70)
ON CONFLICT DO NOTHING;

-- ============================================
-- SEED DEFAULT BOT CONFIG
-- ============================================
INSERT INTO bot_config (
  is_enabled,
  mode,
  default_position_size,
  auto_execute_high_confidence,
  follow_ai_recommendations,
  watchlist,
  scan_interval
) VALUES (
  false,
  'paper',
  500,
  true,
  true,
  ARRAY['NVDA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'AMD', 'CRM', 'NFLX'],
  60
)
ON CONFLICT DO NOTHING;
