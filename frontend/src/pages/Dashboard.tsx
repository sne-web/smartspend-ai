import { useEffect, useState, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useAuth } from "../context/AuthContext"
import {
  getCategoryBreakdown,
  getDashboardSummary,
  getDateRangePreset,
  getSpendingTrend,
  getTransactions,
  type DateRangePreset,
} from "../lib/endpoints"
import type {
  CategoryBreakdown,
  DashboardSummary,
  SpendingTrendPoint,
  Transaction,
} from "../types"

const PRESET_OPTIONS: { value: DateRangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "this_month", label: "This month" },
  { value: "this_year", label: "This year" },
]

const CHART_COLOR = "#90323D"
const GRID_COLOR = "rgba(55, 61, 32, 0.15)"
const AXIS_TEXT = { fill: "#373D20", fontSize: 12 }

interface DateRange {
  start_date: string
  end_date: string
}

function formatCurrency(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value)
  } catch {
    return `${currency} ${value.toFixed(2)}`
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function StatCard({
  label,
  value,
  loading,
  hasValue,
}: {
  label: string
  value: string
  loading: boolean
  hasValue: boolean
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 flex flex-col gap-1">
      <span className="text-xs font-medium text-[#373D20]/70">{label}</span>
      {!hasValue && loading ? (
        <span className="text-lg text-[#373D20]/40">Loading…</span>
      ) : (
        <span
          className={`text-2xl font-semibold text-[#5E0B15] transition-opacity ${loading ? "opacity-50" : ""}`}
        >
          {value}
        </span>
      )}
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 flex flex-col gap-3">
      <h2 className="text-[#5E0B15] font-semibold">{title}</h2>
      {children}
    </div>
  )
}

function SectionState({
  loading,
  error,
  isEmpty,
  emptyMessage,
  hasData,
  children,
}: {
  loading: boolean
  error: string | null
  isEmpty: boolean
  emptyMessage: string
  hasData: boolean
  children: ReactNode
}) {
  if (error) {
    return <p className="text-[#90323D] text-sm py-10 text-center">{error}</p>
  }
  if (loading && !hasData) {
    return <p className="text-[#373D20]/50 text-sm py-10 text-center">Loading…</p>
  }
  if (isEmpty) {
    return <p className="text-[#373D20]/50 text-sm py-10 text-center">{emptyMessage}</p>
  }
  return (
    <div className={`transition-opacity ${loading ? "opacity-50" : ""}`}>{children}</div>
  )
}

function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [preset, setPreset] = useState<DateRangePreset>("30d")
  const [range, setRange] = useState<DateRange | null>(null)

  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  const [categoryData, setCategoryData] = useState<CategoryBreakdown[] | null>(null)
  const [categoryLoading, setCategoryLoading] = useState(true)
  const [categoryError, setCategoryError] = useState<string | null>(null)

  const [trendData, setTrendData] = useState<SpendingTrendPoint[] | null>(null)
  const [trendLoading, setTrendLoading] = useState(true)
  const [trendError, setTrendError] = useState<string | null>(null)

  const [transactions, setTransactions] = useState<Transaction[] | null>(null)
  const [txLoading, setTxLoading] = useState(true)
  const [txError, setTxError] = useState<string | null>(null)

  const currency = user?.preferred_currency ?? "USD"

  // Resolve the selected preset to a concrete date range whenever it changes.
  useEffect(() => {
    let cancelled = false
    getDateRangePreset(preset).then((data) => {
      if (!cancelled) setRange(data)
    })
    return () => {
      cancelled = true
    }
  }, [preset])

  // Summary, category breakdown, and trend all scope to the same resolved range,
  // so they're fired together in one effect (in parallel, via allSettled) instead
  // of three separate effects each independently watching `range` — that would
  // trigger three separate re-render/re-fetch cycles for what is really one
  // "the filter changed" event. allSettled (rather than all) means one endpoint
  // failing doesn't blank out the sections that succeeded.
  useEffect(() => {
    if (!range) return
    let cancelled = false
    const params = { start_date: range.start_date, end_date: range.end_date }

    setSummaryLoading(true)
    setCategoryLoading(true)
    setTrendLoading(true)

    Promise.allSettled([
      getDashboardSummary(params),
      getCategoryBreakdown(params),
      getSpendingTrend({ ...params, group_by: "day" }),
    ]).then(([summaryResult, categoryResult, trendResult]) => {
      if (cancelled) return

      if (summaryResult.status === "fulfilled") {
        setSummary(summaryResult.value)
        setSummaryError(null)
      } else {
        setSummaryError("Couldn't load summary.")
      }
      setSummaryLoading(false)

      if (categoryResult.status === "fulfilled") {
        setCategoryData(categoryResult.value)
        setCategoryError(null)
      } else {
        setCategoryError("Couldn't load category breakdown.")
      }
      setCategoryLoading(false)

      if (trendResult.status === "fulfilled") {
        setTrendData(trendResult.value)
        setTrendError(null)
      } else {
        setTrendError("Couldn't load spending trend.")
      }
      setTrendLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [range])

  // Recent transactions deliberately ignore the date filter (latest 10 overall),
  // so this fetches once on mount rather than depending on `range`.
  useEffect(() => {
    let cancelled = false
    getTransactions({ limit: 10 })
      .then((data) => {
        if (cancelled) return
        setTransactions(data)
        setTxError(null)
      })
      .catch(() => {
        if (!cancelled) setTxError("Couldn't load recent transactions.")
      })
      .finally(() => {
        if (!cancelled) setTxLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  function handleLogout() {
    logout()
    navigate("/login")
  }

  return (
    <div className="min-h-screen bg-[#D9CAB3]">
      <header className="bg-[#5E0B15] px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">SmartSpend AI</h1>
        <div className="flex items-center gap-4">
          <span className="text-white/80 text-sm hidden sm:inline">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="bg-[#90323D] text-white font-medium rounded px-4 py-2 hover:bg-[#a13c48] transition-colors"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <label htmlFor="date-range" className="text-[#373D20] font-medium">
            Date range
          </label>
          <select
            id="date-range"
            value={preset}
            onChange={(e) => setPreset(e.target.value as DateRangePreset)}
            className="bg-white border border-[#90323D]/30 rounded px-3 py-2 text-[#373D20] focus:outline-none focus:ring-2 focus:ring-[#717744]"
          >
            {PRESET_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {summaryError && (
          <p className="text-[#90323D] text-sm">{summaryError}</p>
        )}

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Current balance"
            value={summary ? formatCurrency(summary.current_balance, currency) : "—"}
            loading={summaryLoading}
            hasValue={summary !== null}
          />
          <StatCard
            label="Total income"
            value={summary ? formatCurrency(summary.total_income, currency) : "—"}
            loading={summaryLoading}
            hasValue={summary !== null}
          />
          <StatCard
            label="Total expenses"
            value={summary ? formatCurrency(summary.total_expenses, currency) : "—"}
            loading={summaryLoading}
            hasValue={summary !== null}
          />
          <StatCard
            label="Transactions"
            value={summary ? summary.transaction_count.toLocaleString() : "—"}
            loading={summaryLoading}
            hasValue={summary !== null}
          />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Spending by category">
            <SectionState
              loading={categoryLoading}
              error={categoryError}
              isEmpty={(categoryData?.length ?? 0) === 0}
              emptyMessage="No expenses in this range."
              hasData={(categoryData?.length ?? 0) > 0}
            >
              <ResponsiveContainer width="100%" height={Math.max(220, (categoryData?.length ?? 0) * 40)}>
                <BarChart
                  data={categoryData ?? []}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                >
                  <CartesianGrid horizontal={false} stroke={GRID_COLOR} />
                  <XAxis type="number" tick={AXIS_TEXT} axisLine={{ stroke: GRID_COLOR }} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="category"
                    tick={AXIS_TEXT}
                    axisLine={{ stroke: GRID_COLOR }}
                    tickLine={false}
                    width={100}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value), currency)}
                    contentStyle={{ borderColor: GRID_COLOR, fontSize: 13 }}
                  />
                  <Bar dataKey="total" fill={CHART_COLOR} radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </SectionState>
          </ChartCard>

          <ChartCard title="Spending trend">
            <SectionState
              loading={trendLoading}
              error={trendError}
              isEmpty={(trendData?.length ?? 0) === 0}
              emptyMessage="No expenses in this range."
              hasData={(trendData?.length ?? 0) > 0}
            >
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendData ?? []} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                  <CartesianGrid vertical={false} stroke={GRID_COLOR} />
                  <XAxis dataKey="period_label" tick={AXIS_TEXT} axisLine={{ stroke: GRID_COLOR }} tickLine={false} />
                  <YAxis tick={AXIS_TEXT} axisLine={{ stroke: GRID_COLOR }} tickLine={false} />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value), currency)}
                    contentStyle={{ borderColor: GRID_COLOR, fontSize: 13 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke={CHART_COLOR}
                    strokeWidth={2}
                    dot={{ r: 4, fill: CHART_COLOR, stroke: "#fff", strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </SectionState>
          </ChartCard>
        </section>

        <section className="bg-white rounded-lg shadow-sm p-4 flex flex-col gap-3">
          <h2 className="text-[#5E0B15] font-semibold">Recent transactions</h2>
          <SectionState
            loading={txLoading}
            error={txError}
            isEmpty={(transactions?.length ?? 0) === 0}
            emptyMessage="No transactions yet."
            hasData={(transactions?.length ?? 0) > 0}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[#373D20]/70 border-b border-[#373D20]/10">
                    <th className="py-2 pr-4 font-medium">Date</th>
                    <th className="py-2 pr-4 font-medium">Category</th>
                    <th className="py-2 pr-4 font-medium">Merchant</th>
                    <th className="py-2 pr-4 font-medium text-right">Amount</th>
                    <th className="py-2 font-medium">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {(transactions ?? []).map((tx) => {
                    const isIncome = tx.type === "income"
                    return (
                      <tr key={tx.id} className="border-b border-[#373D20]/5 last:border-0">
                        <td className="py-2 pr-4 text-[#373D20]">{formatDate(tx.date)}</td>
                        <td className="py-2 pr-4 text-[#373D20]">{tx.category}</td>
                        <td className="py-2 pr-4 text-[#373D20]">{tx.merchant ?? "—"}</td>
                        <td
                          className={`py-2 pr-4 text-right font-medium tabular-nums ${
                            isIncome ? "text-[#373D20]" : "text-[#90323D]"
                          }`}
                        >
                          {isIncome ? "+" : "-"}
                          {formatCurrency(tx.amount, currency)}
                        </td>
                        <td className="py-2">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                              isIncome
                                ? "bg-[#717744]/15 text-[#373D20]"
                                : "bg-[#90323D]/10 text-[#90323D]"
                            }`}
                          >
                            {isIncome ? "Income" : "Expense"}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </SectionState>
        </section>
      </main>
    </div>
  )
}

export default Dashboard
