import { useEffect, useState, type FormEvent } from "react"
import { predictCategory, type TransactionInput } from "../lib/endpoints"
import type { PredictionResponse, TransactionType } from "../types"

const PREDICTION_DEBOUNCE_MS = 500
// This model's confidences run much lower than a generic classifier's - with
// 8 categories, random guessing scores ~12.5%, and even correct predictions
// from live testing topped out around 0.35-0.39. Calibrated to that observed
// range, not a textbook cutoff.
const LIKELY_CONFIDENCE_THRESHOLD = 0.35

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

  const [prediction, setPrediction] = useState<PredictionResponse | null>(null)
  const [predictionLoading, setPredictionLoading] = useState(false)

  // Debounced category prediction: re-runs on every merchant/description
  // keystroke, but the cleanup function cancels the previous pending timeout
  // before a new one is scheduled, so a real request only fires once the user
  // pauses for PREDICTION_DEBOUNCE_MS - not on every keystroke.
  useEffect(() => {
    const trimmedMerchant = merchant.trim()
    const trimmedDescription = description.trim()

    if (!trimmedMerchant && !trimmedDescription) {
      setPrediction(null)
      setPredictionLoading(false)
      return
    }

    let cancelled = false
    setPredictionLoading(true)

    const timeoutId = setTimeout(() => {
      predictCategory(trimmedMerchant, trimmedDescription)
        .then((result) => {
          if (!cancelled) setPrediction(result)
        })
        .catch(() => {
          // Silently ignore - a failed suggestion should never error or block the form.
        })
        .finally(() => {
          if (!cancelled) setPredictionLoading(false)
        })
    }, PREDICTION_DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [merchant, description])

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
    "w-full border border-sage-olive/40 rounded px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sage-olive"
  const labelClass = "block text-sm font-medium text-dark-olive mb-1"

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-sm font-medium text-muted-brick bg-muted-brick/10 rounded px-3 py-2">{error}</p>
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
        {predictionLoading && (
          <p className="text-xs text-dark-olive/50 mt-1">Checking category…</p>
        )}
        {!predictionLoading && prediction && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-dark-olive/70">
              Suggested:{" "}
              <span className="font-medium text-deep-maroon">{prediction.category}</span>{" "}
              ({prediction.confidence >= LIKELY_CONFIDENCE_THRESHOLD ? "likely" : "maybe"})
            </span>
            <button
              type="button"
              onClick={() => setCategory(prediction.category)}
              className="text-xs font-medium text-sage-olive hover:underline transition-colors duration-200"
            >
              Use this
            </button>
          </div>
        )}
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
          className="flex-1 bg-deep-maroon text-white font-medium rounded px-4 py-2.5 hover:bg-muted-brick transition-colors duration-200 disabled:opacity-60"
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 bg-white border border-muted-brick/30 text-dark-olive font-medium rounded px-4 py-2.5 hover:bg-warm-cream/40 transition-colors duration-200 disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export default TransactionForm
