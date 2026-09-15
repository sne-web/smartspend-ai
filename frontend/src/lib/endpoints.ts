import { api } from "./api"
import type {
  CategoryBreakdown,
  DashboardSummary,
  DateRangeResponse,
  PredictionResponse,
  SpendingTrendPoint,
  Transaction,
  TransactionType,
  User,
} from "../types"

export interface Token {
  access_token: string
  token_type: string
}

export interface RegisterInput {
  email: string
  password: string
  preferred_currency?: string
  opening_balance?: number
}

export interface LoginInput {
  email: string
  password: string
}

export interface TransactionInput {
  amount: number
  type: TransactionType
  category: string
  merchant?: string | null
  description?: string | null
  date: string
  payment_method?: string | null
}

export type TransactionUpdateInput = Partial<TransactionInput>

export interface TransactionListParams {
  skip?: number
  limit?: number
  merchant?: string
  category?: string
  date?: string
  type?: TransactionType
}

export interface DateRangeParams {
  start_date?: string
  end_date?: string
}

export interface SpendingTrendParams extends DateRangeParams {
  group_by?: "day" | "week" | "month"
}

export function register(data: RegisterInput): Promise<User> {
  return api.post("/auth/register", data).then((res) => res.data)
}

export function login(data: LoginInput): Promise<Token> {
  const form = new URLSearchParams()
  form.set("username", data.email)
  form.set("password", data.password)
  return api.post("/auth/login", form).then((res) => res.data)
}

export function getMe(): Promise<User> {
  return api.get("/auth/me").then((res) => res.data)
}

export function getTransactions(params?: TransactionListParams): Promise<Transaction[]> {
  return api.get("/transactions", { params }).then((res) => res.data)
}

export function createTransaction(data: TransactionInput): Promise<Transaction> {
  return api.post("/transactions", data).then((res) => res.data)
}

export function updateTransaction(id: number, data: TransactionUpdateInput): Promise<Transaction> {
  return api.put(`/transactions/${id}`, data).then((res) => res.data)
}

export function deleteTransaction(id: number): Promise<void> {
  return api.delete(`/transactions/${id}`).then(() => undefined)
}

export function getDashboardSummary(params?: DateRangeParams): Promise<DashboardSummary> {
  return api.get("/dashboard/summary", { params }).then((res) => res.data)
}

export function getCategoryBreakdown(params?: DateRangeParams): Promise<CategoryBreakdown[]> {
  return api.get("/dashboard/category-breakdown", { params }).then((res) => res.data)
}

export function getSpendingTrend(params?: SpendingTrendParams): Promise<SpendingTrendPoint[]> {
  return api.get("/dashboard/spending-trend", { params }).then((res) => res.data)
}

export type DateRangePreset = "today" | "7d" | "30d" | "this_month" | "this_year"

export function getDateRangePreset(preset: DateRangePreset): Promise<DateRangeResponse> {
  return api.get(`/dashboard/date-range/${preset}`).then((res) => res.data)
}

export function predictCategory(merchant: string, description: string): Promise<PredictionResponse> {
  return api.post("/transactions/predict-category", { merchant, description }).then((res) => res.data)
}
