'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, Loader, TrendingUp } from 'lucide-react'
import useSWR from 'swr'

interface Ticker {
  symbol: string
  name: string
  exchange: string
  type: string
}

interface TickerAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelect?: (ticker: Ticker) => void
  placeholder?: string
  className?: string
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function TickerAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Search ticker or company...',
  className = ''
}: TickerAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [debouncedValue, setDebouncedValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, 300)
    return () => clearTimeout(timer)
  }, [value])

  // Fetch tickers
  const { data, isLoading } = useSWR(
    debouncedValue.length >= 1 ? `/api/tickers/search?q=${encodeURIComponent(debouncedValue)}&limit=10` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  const tickers: Ticker[] = data?.results || []

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = useCallback((ticker: Ticker) => {
    onChange(ticker.symbol)
    onSelect?.(ticker)
    setIsOpen(false)
  }, [onChange, onSelect])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
    } else if (e.key === 'Enter' && tickers.length > 0) {
      handleSelect(tickers[0])
    }
  }

  return (
    <div className={`relative ${className}`}>
      <div className="relative flex items-center">
        <Search className="absolute left-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value.toUpperCase())
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-8 pr-8 py-1.5 rounded-lg bg-muted/50 border border-border text-xs font-mono w-full focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {isLoading && (
          <Loader className="absolute right-8 w-3.5 h-3.5 text-muted-foreground animate-spin" />
        )}
        {value && (
          <button 
            onClick={() => { onChange(''); setIsOpen(false) }} 
            className="absolute right-2.5 hover:opacity-70"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && tickers.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 py-1 rounded-lg border border-border bg-card shadow-lg max-h-64 overflow-auto"
        >
          {tickers.map((ticker) => (
            <button
              key={ticker.symbol}
              onClick={() => handleSelect(ticker)}
              className="w-full px-3 py-2 text-left hover:bg-muted/50 flex items-center gap-3 transition-colors"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded bg-primary/10">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm">{ticker.symbol}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    {ticker.exchange}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{ticker.name}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results state */}
      {isOpen && value.length >= 1 && !isLoading && tickers.length === 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 py-4 rounded-lg border border-border bg-card shadow-lg text-center"
        >
          <p className="text-sm text-muted-foreground">No tickers found for &quot;{value}&quot;</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Try a different search term</p>
        </div>
      )}
    </div>
  )
}
