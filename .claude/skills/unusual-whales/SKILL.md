# Unusual Whales API — Claude Code Skill

> To refresh this file with the official version run:
> ```bash
> curl -o .claude/skills/unusual-whales/SKILL.md https://unusualwhales.com/skill.md
> ```
> (requires a session cookie or the file to be publicly accessible from your network)

## Overview

The Unusual Whales API provides options flow, dark pool, greek exposure, congressional
trading, earnings calendars, and more.

- **Base URL:** `https://api.unusualwhales.com`
- **Auth:** `Authorization: Bearer <UW_API_KEY>`
- **OpenAPI spec:** `https://api.unusualwhales.com/api/openapi`
- **Docs:** `https://api.unusualwhales.com/docs`
- **Provider:** `lib/providers/uw.ts` (this project)
- **MCP server:** `https://unusualwhales.com/public-api/mcp`

---

## Client usage

```typescript
import { uw } from "@/lib/providers/uw";
// or for cached version:
import { uwCached } from "@/lib/providers/uw-cached";
```

---

## Endpoint reference

### Dark Pool

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/darkpool/{ticker}` | Dark pool trades for one ticker |
| `GET` | `/api/darkpool/recent` | Most recent dark pool trades across all tickers |

**Client methods:**
```typescript
uw().darkpoolTicker("AAPL", { limit: 50 })
uw().darkpoolRecent({ min_premium: 100_000, limit: 100 })
```

**Key params:** `limit`, `date`, `min_premium`, `max_premium`, `min_size`, `newer_than`, `older_than`

---

### Options Flow Alerts

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/option-trades/flow-alerts` | All flow alerts with rich filtering |
| `GET` | `/api/option-trades/flow-alerts/{id}` | Trades that made up a specific alert |

**Client methods:**
```typescript
uw().flowAlerts({ min_premium: 250_000, limit: 25 })
uw().flowAlerts({ ticker_symbol: "SPY,QQQ", is_call: true, is_ask_side: true })
```

**Key params:** `ticker_symbol`, `min_premium`, `max_premium`, `min_size`, `min_volume`, `is_call`, `is_put`, `is_floor`, `is_sweep`, `is_ask_side`, `is_bid_side`, `is_otm`, `limit`, `newer_than`, `older_than`

**Alert rules:** `RepeatedHits`, `RepeatedHitsAscendingFill`, `RepeatedHitsDescendingFill`, `FloorTradeLargeCap`, `FloorTradeMidCap`, `FloorTradeSmallCap`, `SweepsFollowedByFloor`

---

### Ticker Option Flow

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/stock/{ticker}/flow` | Recent option trades for a ticker |
| `GET` | `/api/stock/{ticker}/flow/expiry` | Flow grouped by expiry |
| `GET` | `/api/stock/{ticker}/flow/strike` | Flow grouped by strike |

**Client methods:**
```typescript
uw().tickerFlowRecent("AAPL", { limit: 100 })
uw().flowPerExpiry("SPY")
uw().flowPerStrike("SPY")
```

---

### Market

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/market/market-tide` | Aggregate market-wide options sentiment |
| `GET` | `/api/market/top-net-impact` | Tickers with highest net premium impact |

**Client methods:**
```typescript
uw().marketTide({ interval_5m: true })
uw().topNetImpact({ limit: 20 })
```

**Market Tide params:** `date`, `interval_5m` (default `true`), `otm_only`

---

### Greek Exposure

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/stock/{ticker}/greek-exposure` | Historical GEX, delta, vanna, charm |
| `GET` | `/api/stock/{ticker}/greek-exposure/strike` | GEX grouped by strike (current day) |
| `GET` | `/api/stock/{ticker}/spot-exposures/strike` | Spot exposure by strike |

**Client methods:**
```typescript
uw().greekExposure("SPY", { timeframe: "1M" })
uw().greekExposureByStrike("SPY")
uw().spotExposures("SPY")
```

---

### Calendars

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/earnings/afterhours` | Earnings reports after market close |
| `GET` | `/api/earnings/premarket` | Earnings reports before market open |
| `GET` | `/api/calendar/fda` | FDA PDUFA / drug approval dates |

**Client methods:**
```typescript
uw().earningsAfterhours()
uw().earningsPremarket()
uw().fdaCalendar()
```

---

### Congressional Trades

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/congress/recent-trades` | Recent house + senate stock trades |
| `GET` | `/api/congress/congress-trader` | Trades by a specific member |

**Client method:**
```typescript
uw().congressUnusual({ limit: 50 })
uw().congressUnusual({ ticker: "NVDA", limit: 20 })
```

---

## WebSocket streaming

Connect to `wss://api.unusualwhales.com/socket?token=<UW_API_KEY>` and join channels.

**Available channels:**

| Channel | Description |
|---------|-------------|
| `flow-alerts` | All flow alerts in real time |
| `option_trades` | Full tape (~6–10M trades/day) |
| `option_trades:TICKER` | Per-ticker tape |
| `off_lit_trades` | Dark pool trades |
| `gex:TICKER` | Live GEX updates |
| `gex_strike:TICKER` | Live GEX by strike |
| `price:TICKER` | Live price updates |
| `news` | Headline news |
| `market_tide` | Real-time market tide |
| `interval_flow` | 5-minute option flow stats per ticker |

**Client usage:**
```typescript
const handle = uw().stream("flow-alerts", (alert) => {
  const a = alert as { total_premium: number; ticker: string; type: string; strike: string };
  if (a.total_premium > 250_000) {
    console.log(`🐋 ${a.ticker} ${a.type} ${a.strike}  $${a.total_premium.toLocaleString()}`);
  }
});

// Disconnect:
handle.close();
```

> **Note:** WebSocket access requires the Advanced API plan.
> The `stream()` method uses native `WebSocket` (Node 22+ / browser).

---

## Caching recommendations

| Endpoint family | Recommended TTL |
|-----------------|----------------|
| `flowAlerts`, `darkpool` | 30 s |
| `marketTide`, `greekExposure`, `topNetImpact` | 60 s |
| `congress` | 5 min |
| `earnings`, `fdaCalendar` | 1 h |

Use `lib/providers/uw-cached.ts` (Vercel KV) to apply these automatically.

---

## Morning scanner priority endpoints

For a 6 AM pre-market brief, call in this order:

1. `flowAlerts({ min_premium: 250_000 })` — prior session whale activity
2. `marketTide()` — overnight positioning shift
3. `topNetImpact()` — tickers with most weighted options pressure
4. `earningsPremarket()` + `earningsAfterhours()` — today's catalysts
5. `fdaCalendar()` — binary events
6. `congressUnusual({ limit: 20 })` — notable political trades
