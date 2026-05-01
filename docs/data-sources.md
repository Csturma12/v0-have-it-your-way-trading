# Data Sources Documentation

## Overview

All widgets in the dashboard fetch real-time market data from multiple APIs. Each data point shows a source badge indicating where the data came from.

## Data Source Types

### LIVE (Primary APIs)
Real-time data directly from market data providers:
- **POLYGON** - Stock quotes, OHLCV, company profile, basic fundamentals, technicals from Polygon.io
- **FINNHUB** - Rich fundamentals (P/E, P/B, P/S, ROE, ROA, margins, beta, div yield, 52w hi/lo, EPS), news, earnings calendars, analyst ratings, executives, company profile from Finnhub
- **UW** - Dark pool flow, options flow, insider trades, congressional trades, market tide, GEX exposure from Unusual Whales
- **FLASH-ALPHA** - Options GEX levels, key support/resistance from Flash Alpha
- **ALPHA-VANTAGE** - Technical indicators as fallback

### DEFAULT
Fallback/calculated data when primary APIs are unavailable:
- **Calculated Values**: Technical indicators (SMA, EMA, RSI) calculated server-side from OHLCV data
- **Estimated Levels**: Support/resistance calculated via pivot points formula
- **Aggregated Data**: Combined data from multiple sources when individual sources fail

**When DEFAULT appears:** 
- Primary API is down or rate-limited
- API returns incomplete data
- Data source preference order selected DEFAULT
- Only shown in source badges when primary sources fail

### Theoretical Data (Shown on Widget Tooltips)
- "N/A" = No data available from any source
- "—" = Data type not available for this ticker

## Data Freshness

All widgets auto-refresh on these intervals:
- **Quotes**: 30 seconds (real-time trading)
- **Technicals**: 60 seconds
- **News/Catalysts**: 5 minutes
- **Fundamentals**: 1 hour (intraday changes minimal)

## T&Cs and Public Deployment

When deploying publicly:
1. **Add Terms & Conditions page** covering:
   - Data latency disclaimers (30s+ delays)
   - Attribution to each data provider (Polygon, Finnhub, Unusual Whales, Flash Alpha)
   - No guarantee of accuracy or completeness
   - Not financial advice

2. **Required Attributions**:
   - "Stock quotes powered by Polygon.io"
   - "Insider data powered by Unusual Whales"
   - "News powered by Finnhub"
   - "Technical analysis powered by multiple sources"

3. **Add Privacy Policy** covering:
   - Which APIs are called with user input (ticker selection)
   - How long data is cached server-side
   - GDPR compliance if EU users

## Debugging Data Sources

To see which source provided data:
1. Check the source badge on each widget header (LIVE/DEFAULT/etc)
2. Check browser console logs: search for "[v0]" prefixed messages
3. Check API response headers in Network tab

