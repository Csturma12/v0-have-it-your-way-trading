'use client'

/**
 * TradingViewCard — integrations card for linking a TradingView username.
 *
 * What it actually does:
 *  - Stores the user's TV @handle in public.profiles via useProfile
 *  - Deep-links "View on TradingView" buttons across the dashboard to
 *    https://tradingview.com/u/<handle>/ instead of generic TV
 *
 * What it explicitly does NOT do (and why):
 *  - No verification of the handle (TV has no public lookup API)
 *  - No tier/subscription detection (TV has no public account API)
 *  - No OAuth (TV doesn't offer "Sign in with TradingView" for third
 *    parties — only enterprise Charting Library licensees)
 *
 * The card is honest about all of the above so users don't expect
 * features we can't deliver. The card is purely additive — every
 * existing TV link still works without a saved handle.
 */

import { useState } from 'react'
import {
  CheckCircle2, ExternalLink, Link2, Unlink, AlertTriangle, Edit2, Save, X,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  useProfile,
  validateTradingViewUsername,
  normalizeTradingViewUsername,
} from '@/lib/hooks/use-profile'

export function TradingViewCard() {
  const {
    user,
    profile,
    loading,
    setTradingViewUsername,
    tradingViewProfileUrl,
  } = useProfile()

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isLinked = Boolean(profile?.tradingviewUsername)

  const startEdit = () => {
    setDraft(profile?.tradingviewUsername ?? '')
    setError(null)
    setEditing(true)
  }

  const cancelEdit = () => {
    setDraft('')
    setError(null)
    setEditing(false)
  }

  const handleSave = async () => {
    setError(null)
    setSaving(true)
    const cleaned = normalizeTradingViewUsername(draft)
    const validationError = validateTradingViewUsername(cleaned)
    if (validationError) {
      setError(validationError)
      setSaving(false)
      return
    }
    const result = await setTradingViewUsername(cleaned)
    setSaving(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setEditing(false)
  }

  const handleUnlink = async () => {
    if (!confirm('Remove your TradingView username? This only affects deep-links from the dashboard.')) {
      return
    }
    setSaving(true)
    await setTradingViewUsername(null)
    setSaving(false)
  }

  return (
    <div
      className={`rounded-lg border p-5 transition-all ${
        isLinked
          ? 'border-theme-green/40 bg-theme-green/5'
          : 'border-border bg-card/50 hover:border-border/80'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-lg flex items-center justify-center font-mono font-bold text-[10px] ${
              isLinked ? 'bg-theme-green/20 text-theme-green' : 'bg-muted text-muted-foreground'
            }`}
          >
            TV
          </div>
          <div>
            <h3 className="font-bold text-base flex items-center gap-2">
              TradingView
              {isLinked && <CheckCircle2 className="w-4 h-4 text-theme-green" />}
            </h3>
            <p className="text-xs text-muted-foreground">
              Link your handle to deep-link dashboard widgets to your TV profile.
            </p>
          </div>
        </div>
      </div>

      {/* Capabilities */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {['Super Chart popout', 'Profile deep-links', '@handle storage'].map(cap => (
          <span
            key={cap}
            className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted/50 text-muted-foreground"
          >
            {cap}
          </span>
        ))}
      </div>

      {/* Honesty notice — what TV does NOT support */}
      <div className="mb-4 flex items-start gap-2 p-2.5 rounded-md bg-muted/30 border border-border/50">
        <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground/70 mt-0.5 flex-shrink-0" />
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          TradingView doesn&apos;t offer a public OAuth or account API.
          Subscription tier and account data can&apos;t be auto-detected.
          Plus features stay active when you click &quot;Open in Super Chart&quot; while logged in to TV.com.
        </p>
      </div>

      {/* Body — varies by state */}
      {loading ? (
        <div className="text-xs font-mono text-muted-foreground">Loading...</div>
      ) : !user ? (
        <div className="text-xs font-mono text-muted-foreground">
          Sign in to link your TradingView handle.
        </div>
      ) : editing ? (
        <div className="space-y-2">
          <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wide mb-1">
            TradingView Username
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground/70 select-none">
              tradingview.com/u/
            </span>
            <Input
              autoFocus
              value={draft}
              onChange={e => {
                setDraft(e.target.value)
                setError(null)
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSave()
                if (e.key === 'Escape') cancelEdit()
              }}
              placeholder="your_username"
              className="flex-1 font-mono text-sm"
              disabled={saving}
            />
          </div>
          <p className="text-[10px] text-muted-foreground/70">
            2-30 characters, letters/numbers/underscores only. Pasting a full URL is fine — we&apos;ll strip it.
          </p>
          {error && (
            <div className="p-2 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-[11px] font-mono">
              {error}
            </div>
          )}
          <div className="flex items-center gap-2 pt-1">
            <Button
              onClick={handleSave}
              disabled={saving || !draft.trim()}
              className="bg-theme-green hover:bg-theme-green/90 text-black font-mono text-xs h-8"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button
              onClick={cancelEdit}
              variant="ghost"
              disabled={saving}
              className="font-mono text-xs h-8"
            >
              <X className="w-3.5 h-3.5 mr-1.5" />
              Cancel
            </Button>
          </div>
        </div>
      ) : isLinked ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 p-2.5 rounded bg-background/50 border border-border/50">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] font-mono text-muted-foreground/70 truncate">
                tradingview.com/u/
              </span>
              <span className="font-mono text-sm font-bold truncate">
                {profile?.tradingviewUsername}
              </span>
            </div>
            <a
              href={tradingViewProfileUrl ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-theme-green transition-colors flex-shrink-0"
              title="Open profile on TradingView"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={startEdit}
              variant="ghost"
              size="sm"
              className="font-mono text-xs h-8"
            >
              <Edit2 className="w-3.5 h-3.5 mr-1.5" />
              Edit
            </Button>
            <Button
              onClick={handleUnlink}
              variant="ghost"
              size="sm"
              disabled={saving}
              className="font-mono text-xs h-8 text-muted-foreground hover:text-red-400"
            >
              <Unlink className="w-3.5 h-3.5 mr-1.5" />
              Unlink
            </Button>
          </div>
        </div>
      ) : (
        <Button
          onClick={startEdit}
          className="bg-theme-green hover:bg-theme-green/90 text-black font-mono text-xs h-9"
        >
          <Link2 className="w-3.5 h-3.5 mr-1.5" />
          Link TradingView Handle
        </Button>
      )}
    </div>
  )
}
