/**
 * Vercel KV-backed UW client.
 *
 * Wraps UWClient with Redis caching via @vercel/kv.  Slow-moving endpoints
 * (market tide, greek exposure, calendars) cache for up to 60 minutes;
 * real-time endpoints (flow alerts, dark pool) cache for 30 seconds.
 * This significantly reduces quota consumption on Vercel deployments.
 *
 * Usage:
 *   import { uwCached } from "@/lib/providers/uw-cached";
 *   const tide = await uwCached.marketTide({ interval_5m: true });
 *
 * Prerequisites:
 *   1. pnpm add @vercel/kv  (already done)
 *   2. Add KV_URL, KV_REST_API_URL, KV_REST_API_TOKEN, KV_REST_API_READ_ONLY_TOKEN
 *      to Vercel project environment variables (auto-populated if you link a KV store).
 */
import { kv } from "@vercel/kv";
import { UWClient } from "./uw";

export const uwCached = new UWClient({
  apiKey: process.env.UW_API_KEY!,
  cache: {
    get: (key) => kv.get(key),
    set: (key, value, ttl) => kv.set(key, value, { ex: ttl }).then(() => undefined),
  },
});
