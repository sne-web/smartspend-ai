import { useEffect, useState, type FormEvent } from "react"
import AppHeader from "../components/AppHeader"
import Modal from "../components/Modal"
import TransactionForm from "../components/TransactionForm"
import { useAuth } from "../context/AuthContext"
import {
  createTransaction,
  deleteTransaction,
  getTransactions,
  updateTransaction,
  type TransactionInput,
  type TransactionListParams,
} from "../lib/endpoints"
import type { Transaction, TransactionType } from "../types"

const PAGE_SIZE = 20

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

function Transactions() {
  const { user } = useAuth()
  const currency = user?.preferred_currency ?? "USD"

  const [merchantFilter, setMerchantFilter] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [dateFilter, setDateFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState<TransactionType | "">("")
  const [appliedFilters, setAppliedFilters] = useState<TransactionListParams>({})
  const [skip, setSkip] = useState(0)

  const [transactions, setTransactions] = useState<Transaction[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)

  function fetchList() {
    setLoading(true)
    getTransactions({ ...appliedFilters, skip, limit: PAGE_SIZE })
      .then((data) => {
        setTransactions(data)
        setError(null)
      })
      .catch(() => setError("Couldn't load transactions."))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters, skip])

  function applyFilters(e: FormEvent) {
    e.preventDefault()
    setSkip(0)
    setAppliedFilters({
      merchant: merchantFilter.trim() || undefined,
      category: categoryFilter.trim() || undefined,
      date: dateFilter || undefined,
      type: (typeFilter || undefined) as TransactionType | undefined,
    })
  }

  function clearFilters() {
    setMerchantFilter("")
    setCategoryFilter("")
    setDateFilter("")
    setTypeFilter("")
    setSkip(0)
    setAppliedFilters({})
  }

  async function handleCreate(data: TransactionInput) {
    await createTransaction(data)
    setShowAddModal(false)
    fetchList()
  }

  async function handleUpdate(data: TransactionInput) {
    if (!editingTransaction) return
    await updateTransaction(editingTransaction.id, data)
    setEditingTransaction(null)
    fetchList()
  }

  async function handleDelete(tx: Transaction) {
    const label = `${tx.type === "income" ? "income" : "expense"} of ${formatCurrency(tx.amount, currency)} (${tx.category})`
    if (!window.confirm(`Delete this ${label}? This can't be undone.`)) {
      return
    }
    await deleteTransaction(tx.id)
    fetchList()
  }

  const inputClass =
    "border border-[#717744]/40 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#717744]"

  return (
    <div className="min-h-screen bg-[#D9CAB3]">
      <AppHeader active="transactions" />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-[#5E0B15]">Transactions</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-[#5E0B15] text-white font-medium rounded px-4 py-2 hover:bg-[#90323D] transition-colors"
          >
            + Add transaction
          </button>
        </div>

        <form onSubmit={applyFilters} className="bg-white rounded-lg shadow-sm p-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-[#373D20]/70 mb-1">Merchant</label>
            <input
              value={merchantFilter}
              onChange={(e) => setMerchantFilter(e.target.value)}
              className={inputClass}
              placeholder="Any"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#373D20]/70 mb-1">Category</label>
            <input
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={inputClass}
              placeholder="Any"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#373D20]/70 mb-1">Date</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#373D20]/70 mb-1">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TransactionType | "")}
              className={inputClass}
            >
              <option value="">All</option>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-[#717744] text-white font-medium rounded px-4 py-2 hover:bg-[#5f6538] transition-colors"
            >
              Filter
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="bg-white border border-[#90323D]/30 text-[#373D20] font-medium rounded px-4 py-2 hover:bg-[#D9CAB3]/40 transition-colors"
            >
              Clear
            </button>
          </div>
        </form>

        <div className="bg-white rounded-lg shadow-sm p-4 flex flex-col gap-3">
          {error && <p className="text-[#90323D] text-sm py-10 text-center">{error}</p>}
          {!error && loading && !transactions && (
            <p className="text-[#373D20]/50 text-sm py-10 text-center">Loading…</p>
          )}
          {!error && transactions && transactions.length === 0 && (
            <p className="text-[#373D20]/50 text-sm py-10 text-center">No transactions match these filters.</p>
          )}
          {!error && transactions && transactions.length > 0 && (
            <div className={`overflow-x-auto transition-opacity ${loading ? "opacity-50" : ""}`}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[#373D20]/70 border-b border-[#373D20]/10">
                    <th className="py-2 pr-4 font-medium">Date</th>
                    <th className="py-2 pr-4 font-medium">Category</th>
                    <th className="py-2 pr-4 font-medium">Merchant</th>
                    <th className="py-2 pr-4 font-medium text-right">Amount</th>
                    <th className="py-2 pr-4 font-medium">Type</th>
                    <th className="py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
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
                        <td className="py-2 pr-4">
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
                        <td className="py-2">
                          <div className="flex gap-3">
                            <button
                              onClick={() => setEditingTransaction(tx)}
                              className="text-[#717744] hover:underline text-sm font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(tx)}
                              className="text-[#90323D] hover:underline text-sm font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-[#373D20]/60">
              Showing {transactions && transactions.length > 0 ? skip + 1 : 0}–{skip + (transactions?.length ?? 0)}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setSkip((s) => Math.max(0, s - PAGE_SIZE))}
                disabled={skip === 0}
                className="bg-white border border-[#90323D]/30 text-[#373D20] text-sm font-medium rounded px-3 py-1.5 hover:bg-[#D9CAB3]/40 transition-colors disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setSkip((s) => s + PAGE_SIZE)}
                disabled={!transactions || transactions.length < PAGE_SIZE}
                className="bg-white border border-[#90323D]/30 text-[#373D20] text-sm font-medium rounded px-3 py-1.5 hover:bg-[#D9CAB3]/40 transition-colors disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </main>

      {showAddModal && (
        <Modal title="Add transaction" onClose={() => setShowAddModal(false)}>
          <TransactionForm
            onSubmit={handleCreate}
            onCancel={() => setShowAddModal(false)}
            submitLabel="Add transaction"
          />
        </Modal>
      )}

      {editingTransaction && (
        <Modal title="Edit transaction" onClose={() => setEditingTransaction(null)}>
          <TransactionForm
            initialValues={editingTransaction}
            onSubmit={handleUpdate}
            onCancel={() => setEditingTransaction(null)}
            submitLabel="Save changes"
          />
        </Modal>
      )}
    </div>
  )
}

export default Transactions
