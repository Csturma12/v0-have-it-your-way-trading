"use client"

/**
 * useUserLayouts — durable, per-user dashboard layouts backed by Supabase.
 *
 * Why this hook exists
 * --------------------
 * Before Supabase, layouts lived in localStorage under v0-widget-grid-layout-v7.
 * That meant: lost on browser switch, lost on cache clear, no per-user
 * separation when multiple people log into the same browser, and no way for
 * the user to manage 5 named layouts cleanly.
 *
 * Now: layouts persist in `public.user_layouts` (RLS-protected — each user
 * only sees their own). The factory default still lives in code (in
 * widget-grid.tsx) and is ALWAYS available alongside the user's saved
 * layouts. The user can save up to 5 of their own; the count is enforced
 * by a `BEFORE INSERT` trigger in Postgres so the limit can't be bypassed
 * by a misbehaving client.
 *
 * Auto-migration
 * --------------
 * On first authenticated load after this ships, any layouts found in
 * legacy localStorage keys (v0-widget-grid-saved-layouts,
 * v0-widget-grid-layout-v7, etc.) are copied into Supabase up to the
 * 5-layout cap, then the localStorage keys are cleared so we don't
 * re-migrate. Migration is idempotent: if any layouts exist for the user
 * in Supabase already, migration is skipped.
 */

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

// Match the existing widget-grid.tsx shape so callers don't have to remap.
export interface UserLayout {
  id: string
  name: string
  layout: any[]
  widgets: any[]
  isDefault: boolean
  updatedAt: string
}

export interface UseUserLayoutsResult {
  user: User | null
  layouts: UserLayout[]
  loading: boolean
  /** True until both the auth check AND the initial layouts fetch finish.
   *  Use this (not `loading`) to gate showing the dashboard so we don't
   *  flash the factory default while saved layouts are still loading. */
  initializing: boolean
  /** Save a new named layout. Returns the new row, or null with `error`
   *  if the 5-layout cap is hit (or any other DB error). */
  saveLayout: (
    name: string,
    layout: any[],
    widgets: any[],
    opts?: { setAsDefault?: boolean }
  ) => Promise<{ data: UserLayout | null; error: string | null }>
  /** Overwrite an existing layout (matched by name). Useful when the user
   *  picks "Save" on a layout they already have — replace, don't error. */
  updateLayout: (
    name: string,
    layout: any[],
    widgets: any[]
  ) => Promise<{ data: UserLayout | null; error: string | null }>
  deleteLayout: (id: string) => Promise<{ error: string | null }>
  /** Mark a saved layout as the user's auto-load default (the one shown
   *  on next login). The DB trigger guarantees only one default per user. */
  setAsDefault: (id: string) => Promise<{ error: string | null }>
  /** Force a reload from the DB. */
  refresh: () => Promise<void>
}

const LEGACY_SAVED_LAYOUTS_KEYS = [
  'v0-widget-grid-saved-layouts',
  'v0-widget-grid-saved-layouts-v2',
]
const LEGACY_LAST_LAYOUT_KEY = 'v0-widget-grid-layout-v7'

interface LegacySavedLayout {
  name: string
  layout: any[]
  widgets: any[]
}

/** Strip runtime-only fields RGL adds (`moved`, `static`, `resizeHandles`)
 *  before persisting. visibleLayout in widget-grid.tsx re-stamps these on
 *  every render so they don't need to be stored. */
function stripRuntimeFields(layout: any[]): any[] {
  return layout.map(({ moved, static: _static, resizeHandles, ...rest }) => rest)
}

/** Pull legacy layouts out of localStorage. Tolerant of missing/malformed
 *  data — anything bad is dropped silently rather than blocking migration. */
function readLegacyLayouts(): LegacySavedLayout[] {
  if (typeof window === 'undefined') return []

  const collected: LegacySavedLayout[] = []
  const seenNames = new Set<string>()

  for (const key of LEGACY_SAVED_LAYOUTS_KEYS) {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) continue
      for (const item of parsed) {
        if (
          item &&
          typeof item.name === 'string' &&
          Array.isArray(item.layout) &&
          Array.isArray(item.widgets) &&
          !seenNames.has(item.name)
        ) {
          collected.push(item)
          seenNames.add(item.name)
        }
      }
    } catch {
      // Ignore parse errors — better to skip a corrupt key than throw.
    }
  }

  return collected.slice(0, 5)
}

function clearLegacyKeys() {
  if (typeof window === 'undefined') return
  for (const key of LEGACY_SAVED_LAYOUTS_KEYS) {
    try { localStorage.removeItem(key) } catch {}
  }
  // Note: we deliberately do NOT clear LEGACY_LAST_LAYOUT_KEY here.
  // widget-grid.tsx still uses it as a working draft cache between saves;
  // dropping it would lose the user's in-progress edits at logout.
}

function rowToLayout(row: any): UserLayout {
  return {
    id: row.id,
    name: row.name,
    layout: row.layout,
    widgets: row.widgets,
    isDefault: row.is_default,
    updatedAt: row.updated_at,
  }
}

export function useUserLayouts(): UseUserLayoutsResult {
  // The browser client returns null if Supabase env vars aren't configured.
  // Every method below early-returns in that case so the app stays usable
  // (just falls back to whatever local draft / DEFAULT_LAYOUT is showing).
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [layouts, setLayouts] = useState<UserLayout[]>([])
  const [loading, setLoading] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [layoutsFetched, setLayoutsFetched] = useState(false)

  const fetchLayouts = useCallback(
    async (userId: string) => {
      if (!supabase) return
      setLoading(true)
      const { data, error } = await supabase
        .from('user_layouts')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('[v0] useUserLayouts: fetch failed', error)
        setLayouts([])
      } else {
        setLayouts((data ?? []).map(rowToLayout))
      }
      setLoading(false)
      setLayoutsFetched(true)
    },
    [supabase]
  )

  /** Migrate localStorage layouts on first authenticated load.
   *  Idempotent: skips if user already has any layouts in Supabase. */
  const migrateLegacyLayouts = useCallback(
    async (userId: string) => {
      if (!supabase) return
      const { count, error: countError } = await supabase
        .from('user_layouts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)

      if (countError) {
        console.error('[v0] useUserLayouts: migrate count failed', countError)
        return
      }
      if ((count ?? 0) > 0) return // already migrated or has Supabase layouts

      const legacy = readLegacyLayouts()
      if (legacy.length === 0) return

      const rows = legacy.slice(0, 5).map((item, idx) => ({
        user_id: userId,
        name: item.name,
        layout: stripRuntimeFields(item.layout),
        widgets: item.widgets,
        is_default: idx === 0, // first migrated layout becomes the default
      }))

      const { error: insertError } = await supabase
        .from('user_layouts')
        .insert(rows)

      if (insertError) {
        console.error('[v0] useUserLayouts: migration insert failed', insertError)
        return
      }

      clearLegacyKeys()
    },
    [supabase]
  )

  // Auth subscription: refetch whenever the user changes (login, logout,
  // session refresh). onAuthStateChange fires once on mount with the
  // current session, so we don't need a separate getUser() call.
  useEffect(() => {
    if (!supabase) {
      // No Supabase — auth check is "done" (there is no auth) and there
      // are no layouts to fetch. Mark both so callers don't block forever.
      setAuthChecked(true)
      setLayoutsFetched(true)
      return
    }
    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const nextUser = session?.user ?? null
        setUser(nextUser)
        setAuthChecked(true)

        if (nextUser) {
          await migrateLegacyLayouts(nextUser.id)
          await fetchLayouts(nextUser.id)
        } else {
          setLayouts([])
          setLayoutsFetched(true)
        }
      }
    )

    return () => subscription.subscription.unsubscribe()
  }, [supabase, fetchLayouts, migrateLegacyLayouts])

  const refresh = useCallback(async () => {
    if (user) await fetchLayouts(user.id)
  }, [user, fetchLayouts])

  const saveLayout = useCallback<UseUserLayoutsResult['saveLayout']>(
    async (name, layout, widgets, opts) => {
      if (!supabase) return { data: null, error: 'Supabase not configured' }
      if (!user) {
        return { data: null, error: 'Not signed in' }
      }
      // If a layout with this name already exists for this user, treat
      // Save as Update — the user expects "save" to replace.
      const existing = layouts.find(l => l.name === name)
      if (existing) {
        const { data, error } = await supabase
          .from('user_layouts')
          .update({
            layout: stripRuntimeFields(layout),
            widgets,
            ...(opts?.setAsDefault ? { is_default: true } : {}),
          })
          .eq('id', existing.id)
          .select()
          .single()
        if (error) return { data: null, error: error.message }
        await refresh()
        return { data: rowToLayout(data), error: null }
      }

      const { data, error } = await supabase
        .from('user_layouts')
        .insert({
          user_id: user.id,
          name,
          layout: stripRuntimeFields(layout),
          widgets,
          is_default: opts?.setAsDefault ?? false,
        })
        .select()
        .single()

      if (error) {
        // Postgres trigger raises this exact text when the cap is hit.
        const isCap = error.message.includes('Maximum of 5 layouts')
        return {
          data: null,
          error: isCap
            ? 'You already have 5 saved layouts. Delete one to save another.'
            : error.message,
        }
      }
      await refresh()
      return { data: rowToLayout(data), error: null }
    },
    [user, layouts, supabase, refresh]
  )

  const updateLayout = useCallback<UseUserLayoutsResult['updateLayout']>(
    async (name, layout, widgets) => {
      if (!supabase) return { data: null, error: 'Supabase not configured' }
      if (!user) return { data: null, error: 'Not signed in' }
      const existing = layouts.find(l => l.name === name)
      if (!existing) return { data: null, error: 'Layout not found' }
      const { data, error } = await supabase
        .from('user_layouts')
        .update({ layout: stripRuntimeFields(layout), widgets })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) return { data: null, error: error.message }
      await refresh()
      return { data: rowToLayout(data), error: null }
    },
    [user, layouts, supabase, refresh]
  )

  const deleteLayout = useCallback<UseUserLayoutsResult['deleteLayout']>(
    async id => {
      if (!supabase) return { error: 'Supabase not configured' }
      if (!user) return { error: 'Not signed in' }
      const { error } = await supabase
        .from('user_layouts')
        .delete()
        .eq('id', id)
      if (error) return { error: error.message }
      await refresh()
      return { error: null }
    },
    [user, supabase, refresh]
  )

  const setAsDefault = useCallback<UseUserLayoutsResult['setAsDefault']>(
    async id => {
      if (!supabase) return { error: 'Supabase not configured' }
      if (!user) return { error: 'Not signed in' }
      const { error } = await supabase
        .from('user_layouts')
        .update({ is_default: true })
        .eq('id', id)
      if (error) return { error: error.message }
      await refresh()
      return { error: null }
    },
    [user, supabase, refresh]
  )

  return {
    user,
    layouts,
    loading,
    initializing: !authChecked || (!!user && !layoutsFetched),
    saveLayout,
    updateLayout,
    deleteLayout,
    setAsDefault,
    refresh,
  }
}
