'use client'

import { useCallback, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

/**
 * useProfile — load and update the current user's public.profiles row.
 *
 * Profile rows are auto-created by the on_auth_user_created trigger when
 * a user signs up, and backfilled for existing users by the migration. So
 * once the user is authenticated, fetchProfile should always return a row.
 * If it doesn't (which would mean the trigger failed), we silently insert
 * one to self-heal — RLS lets the user insert their own profile.
 *
 * Update logic uses upsert against id (the PK), which is idempotent and
 * cheap to call repeatedly. Validation runs client-side AND server-side
 * (CHECK constraints in Postgres) so corrupt data can't reach the DB
 * even if the client is bypassed.
 */

export type TradingViewTier = 'free' | 'pro' | 'pro_plus' | 'premium'

export interface UserProfile {
  id: string
  tradingviewUsername: string | null
  tradingviewTier: TradingViewTier | null
  createdAt: string
  updatedAt: string
}

interface UseProfileResult {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  /** Save a TradingView username. Pass null/empty to clear. */
  setTradingViewUsername: (
    username: string | null
  ) => Promise<{ data: UserProfile | null; error: string | null }>
  /** Update the self-reported TV tier. */
  setTradingViewTier: (
    tier: TradingViewTier | null
  ) => Promise<{ data: UserProfile | null; error: string | null }>
  /** Build a deep link to the user's TV profile page. */
  tradingViewProfileUrl: string | null
}

/**
 * Validate a TradingView username against TV's own format rules.
 * - 2-30 characters
 * - alphanumerics + underscore only
 * - no leading/trailing underscores (TV's actual rule)
 *
 * Returns null if valid, error message if not.
 */
export function validateTradingViewUsername(value: string): string | null {
  const trimmed = value.trim()
  if (trimmed.length === 0) return 'Username cannot be empty'
  if (trimmed.length < 2) return 'Username must be at least 2 characters'
  if (trimmed.length > 30) return 'Username cannot exceed 30 characters'
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return 'Only letters, numbers, and underscores allowed'
  }
  if (trimmed.startsWith('_') || trimmed.endsWith('_')) {
    return 'Username cannot start or end with an underscore'
  }
  return null
}

/** Strip leading @, whitespace, and any URL prefix the user might paste. */
export function normalizeTradingViewUsername(value: string): string {
  return value
    .trim()
    .replace(/^https?:\/\/(www\.)?tradingview\.com\/u\//, '')
    .replace(/^@/, '')
    .replace(/\/$/, '')
}

function rowToProfile(row: any): UserProfile {
  return {
    id: row.id,
    tradingviewUsername: row.tradingview_username ?? null,
    tradingviewTier: row.tradingview_tier ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function useProfile(): UseProfileResult {
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(
    async (userId: string) => {
      if (!supabase) return
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('[v0] useProfile fetch error:', error)
        setProfile(null)
        setLoading(false)
        return
      }

      if (data) {
        setProfile(rowToProfile(data))
        setLoading(false)
        return
      }

      // No row — self-heal by inserting one. The trigger should have
      // created it; this is a fallback for older accounts that predate
      // the trigger. RLS lets the user insert their own row.
      const { data: inserted, error: insertError } = await supabase
        .from('profiles')
        .insert({ id: userId })
        .select()
        .single()

      if (insertError) {
        console.error('[v0] useProfile self-heal insert failed:', insertError)
        setProfile(null)
      } else {
        setProfile(rowToProfile(inserted))
      }
      setLoading(false)
    },
    [supabase]
  )

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const nextUser = session?.user ?? null
        setUser(nextUser)
        if (nextUser) {
          await fetchProfile(nextUser.id)
        } else {
          setProfile(null)
          setLoading(false)
        }
      }
    )
    return () => {
      subscription.subscription.unsubscribe()
    }
  }, [supabase, fetchProfile])

  const setTradingViewUsername = useCallback<
    UseProfileResult['setTradingViewUsername']
  >(
    async username => {
      if (!supabase) return { data: null, error: 'Supabase not configured' }
      if (!user) return { data: null, error: 'Not signed in' }

      // Normalize and validate. Empty/null clears the field.
      let normalized: string | null = null
      if (username !== null && username !== '') {
        const cleaned = normalizeTradingViewUsername(username)
        const validationError = validateTradingViewUsername(cleaned)
        if (validationError) return { data: null, error: validationError }
        normalized = cleaned
      }

      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          tradingview_username: normalized,
        })
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      const next = rowToProfile(data)
      setProfile(next)
      return { data: next, error: null }
    },
    [supabase, user]
  )

  const setTradingViewTier = useCallback<UseProfileResult['setTradingViewTier']>(
    async tier => {
      if (!supabase) return { data: null, error: 'Supabase not configured' }
      if (!user) return { data: null, error: 'Not signed in' }

      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          tradingview_tier: tier,
        })
        .select()
        .single()

      if (error) return { data: null, error: error.message }

      const next = rowToProfile(data)
      setProfile(next)
      return { data: next, error: null }
    },
    [supabase, user]
  )

  const tradingViewProfileUrl = profile?.tradingviewUsername
    ? `https://www.tradingview.com/u/${profile.tradingviewUsername}/`
    : null

  return {
    user,
    profile,
    loading,
    setTradingViewUsername,
    setTradingViewTier,
    tradingViewProfileUrl,
  }
}
