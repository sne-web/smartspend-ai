export interface User {
  id: number
  email: string
  preferred_currency: string
  opening_balance: number
  created_at: string
}

export type TransactionType = "income" | "expense"

export interface Transaction {
  id: number
  user_id: number
  amount: number
  type: TransactionType
  category: string
  merchant: string | null
  description: string | null
  date: string
  payment_method: string | null
  created_at: string
}

export interface DashboardSummary {
  current_balance: number
  total_income: number
  total_expenses: number
  transaction_count: number
}

export interface CategoryBreakdown {
  category: string
  total: number
}

export interface SpendingTrendPoint {
  period_label: string
  total: number
}

export interface DateRangeResponse {
  start_date: string
  end_date: string
}
