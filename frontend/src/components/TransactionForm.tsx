import { useState, type FormEvent } from "react"
import type { TransactionInput } from "../lib/endpoints"
import type { TransactionType } from "../types"

interface TransactionFormProps {
  initialValues?: Partial<TransactionInput>
  onSubmit: (data: TransactionInput) => Promise<void>
  onCancel: () => void
  submitLabel?: string
}

function toDateInputValue(iso: string | undefined): string {
  if (!iso) return new Date().toISOString().slice(0, 10)
  return iso.slice(0, 10)
}

function TransactionForm({ initialValues, onSubmit, onCancel, submitLabel = "Save" }: TransactionFormProps) {
  const [amount, setAmount] = useState(initialValues?.amount?.toString() ?? "")
  const [type, setType] = useState<TransactionType>(initialValues?.type ?? "expense")
  const [category, setCategory] = useState(initialValues?.category ?? "")
  const [merchant, setMerchant] = useState(initialValues?.merchant ?? "")
  const [description, setDescription] = useState(initialValues?.description ?? "")
  const [date, setDate] = useState(toDateInputValue(initialValues?.date))
  const [paymentMethod, setPaymentMethod] = useState(initialValues?.payment_method ?? "")

  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Amount must be a positive number.")
      return
    }
    if (!category.trim()) {
      setError("Category is required.")
      return
    }
    if (!date) {
      setError("Date is required.")
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({
        amount: parsedAmount,
        type,
        category: category.trim(),
        merchant: merchant.trim() || null,
        description: description.trim() || null,
        date: new Date(`${date}T00:00:00`).toISOString(),
        payment_method: paymentMethod.trim() || null,
      })
    } catch {
      setError("Couldn't save transaction.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputClass =
    "w-full border border-[#717744]/40 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#717744]"
  const labelClass = "block text-sm font-medium text-[#373D20] mb-1"

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-sm font-medium text-[#90323D] bg-[#90323D]/10 rounded px-3 py-2">{error}</p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Amount</label>
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TransactionType)}
            className={inputClass}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Category</label>
        <input
          type="text"
          required
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="e.g. Groceries"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Merchant</label>
          <input
            type="text"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            placeholder="Optional"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Date</label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Payment method</label>
        <input
          type="text"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          placeholder="Optional — e.g. Credit card"
          className={inputClass}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-[#5E0B15] text-white font-medium rounded px-4 py-2 hover:bg-[#90323D] transition-colors disabled:opacity-60"
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 bg-white border border-[#90323D]/30 text-[#373D20] font-medium rounded px-4 py-2 hover:bg-[#D9CAB3]/40 transition-colors disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export default TransactionForm
