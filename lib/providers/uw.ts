/**
 * Unusual Whales API client.
 *
 * Docs: https://api.unusualwhales.com/docs
 * Base URL: https://api.unusualwhales.com
 * Auth: Bearer token via UW_API_KEY env var
 */

const BASE_URL = "https://api.unusualwhales.com";
const WS_URL = "wss://api.unusualwhales.com/socket";

/** Seconds to cache each endpoint family. */
const TTL = {
  flowAlerts: 30,
  darkpool: 30,
  flow: 30,
  marketTide: 60,
  greekExposure: 60,
  spotExposures: 60,
  topNetImpact: 60,
  congress: 300,
  earnings: 3600,
  fda: 3600,
} as const;

export interface CacheStore {
  get: (key: string) => Promise<unknown>;
  set: (key: string, value: unknown, ttl: number) => Promise<void>;
}

export interface UWClientOptions {
  apiKey: string;
  cache?: CacheStore;
  baseUrl?: string;
}

export interface StreamHandle {
  close: () => void;
}

type Params = Record<string, string | number | boolean | undefined>;

export class UWClient {
  private apiKey: string;
  private cache?: CacheStore;
  private baseUrl: string;

  constructor(options: UWClientOptions) {
    this.apiKey = options.apiKey;
    this.cache = options.cache;
    this.baseUrl = options.baseUrl ?? BASE_URL;
  }

  private async get<T = unknown>(path: string, params?: Params, ttl?: number): Promise<T> {
    const cacheKey = `uw:${path}:${JSON.stringify(params ?? {})}`;

    if (this.cache && ttl) {
      const cached = await this.cache.get(cacheKey);
      if (cached != null) return cached as T;
    }

    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }
    }

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "application/json",
      },
      // Next.js ISR revalidation hint — ignored outside Next.js
      next: { revalidate: ttl },
    } as RequestInit);

    if (!res.ok) {
      throw new Error(`UW API ${res.status} ${path}: ${await res.text()}`);
    }

    const data = (await res.json()) as T;

    if (this.cache && ttl) {
      await this.cache.set(cacheKey, data, ttl);
    }

    return data;
  }

  // ── Dark Pool ────────────────────────────────────────────────────────────────

  /** Dark pool trades for a single ticker. */
  darkpoolTicker(
    ticker: string,
    params?: {
      limit?: number;
      date?: string;
      min_premium?: number;
      max_premium?: number;
      min_size?: number;
      newer_than?: number;
      older_than?: number;
    }
  ) {
    return this.get(`/api/darkpool/${encodeURIComponent(ticker)}`, params as Params, TTL.darkpool);
  }

  /** Most recent dark pool trades across all tickers. */
  darkpoolRecent(params?: {
    limit?: number;
    date?: string;
    min_premium?: number;
    max_premium?: number;
    min_size?: number;
    min_volume?: number;
  }) {
    return this.get("/api/darkpool/recent", params as Params, TTL.darkpool);
  }

  // ── Options Flow ─────────────────────────────────────────────────────────────

  /**
   * Flow alerts — rule-based aggregations on the full tape.
   * Pass ticker_symbol to filter by one or more tickers (comma-separated).
   */
  flowAlerts(params?: {
    ticker_symbol?: string;
    min_premium?: number;
    max_premium?: number;
    min_size?: number;
    max_size?: number;
    min_volume?: number;
    max_volume?: number;
    min_open_interest?: number;
    is_call?: boolean;
    is_put?: boolean;
    is_floor?: boolean;
    is_sweep?: boolean;
    is_ask_side?: boolean;
    is_bid_side?: boolean;
    is_otm?: boolean;
    limit?: number;
    newer_than?: number;
    older_than?: number;
  }) {
    return this.get("/api/option-trades/flow-alerts", params as Params, TTL.flowAlerts);
  }

  /** Recent option flow trades for a ticker. */
  tickerFlowRecent(ticker: string, params?: { limit?: number; date?: string }) {
    return this.get(
      `/api/stock/${encodeURIComponent(ticker)}/flow`,
      params as Params,
      TTL.flow
    );
  }

  /** Option flow grouped by expiry for a ticker. */
  flowPerExpiry(ticker: string, params?: { date?: string }) {
    return this.get(
      `/api/stock/${encodeURIComponent(ticker)}/flow/expiry`,
      params as Params,
      TTL.flow
    );
  }

  /** Option flow grouped by strike for a ticker. */
  flowPerStrike(ticker: string, params?: { date?: string }) {
    return this.get(
      `/api/stock/${encodeURIComponent(ticker)}/flow/strike`,
      params as Params,
      TTL.flow
    );
  }

  // ── Market ───────────────────────────────────────────────────────────────────

  /**
   * Market Tide — proprietary aggregate of market-wide options activity.
   * Defaults to current/last market day, 1-minute candles.
   * Pass interval_5m=true for 5-minute candles.
   */
  marketTide(params?: { date?: string; interval_5m?: boolean; otm_only?: boolean }) {
    return this.get("/api/market/market-tide", params as Params, TTL.marketTide);
  }

  /** Top tickers by net premium (equal split bullish / bearish). */
  topNetImpact(params?: { date?: string; limit?: number }) {
    return this.get("/api/market/top-net-impact", params as Params, TTL.topNetImpact);
  }

  // ── Greek Exposure ───────────────────────────────────────────────────────────

  /** Historical greek exposure (GEX, delta, vanna, charm) for a ticker. */
  greekExposure(ticker: string, params?: { date?: string; timeframe?: string }) {
    return this.get(
      `/api/stock/${encodeURIComponent(ticker)}/greek-exposure`,
      params as Params,
      TTL.greekExposure
    );
  }

  /** Greek exposure for a ticker grouped by strike price. */
  greekExposureByStrike(ticker: string, params?: { date?: string }) {
    return this.get(
      `/api/stock/${encodeURIComponent(ticker)}/greek-exposure/strike`,
      params as Params,
      TTL.greekExposure
    );
  }

  /** Spot exposure (charm, delta, gamma, vanna) for a ticker grouped by strike. */
  spotExposures(ticker: string, params?: { date?: string }) {
    return this.get(
      `/api/stock/${encodeURIComponent(ticker)}/spot-exposures/strike`,
      params as Params,
      TTL.spotExposures
    );
  }

  // ── Calendars ────────────────────────────────────────────────────────────────

  /** Companies reporting earnings after market close. */
  earningsAfterhours(params?: { date?: string; limit?: number }) {
    return this.get("/api/earnings/afterhours", params as Params, TTL.earnings);
  }

  /** Companies reporting earnings before market open. */
  earningsPremarket(params?: { date?: string; limit?: number }) {
    return this.get("/api/earnings/premarket", params as Params, TTL.earnings);
  }

  /** Upcoming FDA drug approval / PDUFA calendar. */
  fdaCalendar(params?: { date?: string; limit?: number }) {
    return this.get("/api/calendar/fda", params as Params, TTL.fda);
  }

  // ── Congress ─────────────────────────────────────────────────────────────────

  /** Recent congressional stock trades (house + senate). */
  congressUnusual(params?: { limit?: number; date?: string; ticker?: string; page?: number }) {
    return this.get("/api/congress/recent-trades", params as Params, TTL.congress);
  }

  // ── Streaming (WebSocket) ────────────────────────────────────────────────────

  /**
   * Subscribe to a real-time WebSocket channel.
   *
   * Common channels:
   *   "flow-alerts"            — all flow alerts
   *   "option_trades"          — full tape (~6M trades/day)
   *   "option_trades:TICKER"   — per-ticker tape
   *   "off_lit_trades"         — dark pool trades
   *   "gex:TICKER"             — live GEX updates
   *   "price:TICKER"           — live price updates
   *   "news"                   — headline news
   *
   * Requires the Advanced API plan for WebSocket access.
   * Requires WebSocket support in the runtime (Node 22+ or a `ws` polyfill).
   *
   * @example
   * const handle = uw().stream("flow-alerts", (alert) => {
   *   if ((alert as any).total_premium > 250_000) console.log(alert);
   * });
   * // later: handle.close();
   */
  stream(channel: string, onMessage: (data: unknown) => void): StreamHandle {
    const wsUrl = `${WS_URL}?token=${this.apiKey}`;
    const ws = new WebSocket(wsUrl);

    ws.addEventListener("open", () => {
      ws.send(JSON.stringify({ channel, msg_type: "join" }));
    });

    ws.addEventListener("message", (event) => {
      try {
        const payload = JSON.parse(event.data as string);
        // payload format: [channel_name, data_object]
        if (Array.isArray(payload) && payload.length === 2) {
          onMessage(payload[1]);
        }
      } catch {
        // ignore malformed frames
      }
    });

    ws.addEventListener("error", (err) => {
      console.error("[UW stream error]", err);
    });

    return { close: () => ws.close() };
  }
}

// ── Singleton factory ────────────────────────────────────────────────────────

let _client: UWClient | undefined;

/**
 * Returns a shared UWClient instance configured from UW_API_KEY env var.
 * Safe to call repeatedly — the same instance is reused per process.
 */
export function uw(): UWClient {
  if (!_client) {
    const apiKey = process.env.UW_API_KEY;
    if (!apiKey) throw new Error("UW_API_KEY environment variable is not set");
    _client = new UWClient({ apiKey });
  }
  return _client;
}
