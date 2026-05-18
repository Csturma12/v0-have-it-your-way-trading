export type RadarKind =
  | 'darkpool'
  | 'block'
  | 'insider'
  | 'congress'
  | 'flow'
  | 'filing-8k'
  | 'filing-4'
  | 'filing-13d'
  | 'contract-dod'
  | 'contract-award'
  | 'trending'

export type RadarSentiment = 'bullish' | 'bearish' | 'neutral'

export interface RadarItem {
  id: string
  kind: RadarKind
  ticker?: string | null
  title: string
  detail?: string
  source: string
  url?: string
  amount?: number
  sentiment?: RadarSentiment
  timestamp: number
}

export interface RadarResponse {
  items: RadarItem[]
  source: string
  fetchedAt: number
  errors?: string[]
}
