import type { ReactNode } from "react"

interface SectionStateProps {
  loading: boolean
  error: string | null
  isEmpty: boolean
  emptyMessage: string
  hasData: boolean
  children: ReactNode
}

function SectionState({ loading, error, isEmpty, emptyMessage, hasData, children }: SectionStateProps) {
  if (error) {
    return <p className="text-muted-brick text-sm py-10 text-center">{error}</p>
  }
  if (loading && !hasData) {
    return <p className="text-dark-olive/50 text-sm py-10 text-center">Loading…</p>
  }
  if (isEmpty) {
    return <p className="text-dark-olive/50 text-sm py-10 text-center">{emptyMessage}</p>
  }
  return <div className={`transition-opacity duration-200 ${loading ? "opacity-50" : ""}`}>{children}</div>
}

export default SectionState
