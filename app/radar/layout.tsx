import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Trading Tools',
  description: 'Pre-move radar combining UW signals, SEC filings, gov contracts, and social trending.',
}

export default function RadarLayout({ children }: { children: React.ReactNode }) {
  return children
}
