import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [preferredCurrency, setPreferredCurrency] = useState("USD")
  const [openingBalance, setOpeningBalance] = useState("0")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await register({
        email,
        password,
        preferred_currency: preferredCurrency,
        opening_balance: Number(openingBalance),
      })
      navigate("/dashboard")
    } catch {
      setError("Could not create account. That email may already be registered.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#D9CAB3] px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-lg shadow-md p-8 space-y-4 border border-[#90323D]/20"
      >
        <h1 className="text-2xl font-bold text-[#5E0B15]">Create an account</h1>

        {error && (
          <p className="text-sm font-medium text-[#90323D] bg-[#90323D]/10 rounded px-3 py-2">
            {error}
          </p>
        )}

        <div>
          <label className="block text-sm font-medium text-[#373D20] mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-[#717744]/40 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#717744]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#373D20] mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-[#717744]/40 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#717744]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#373D20] mb-1">
            Preferred currency
          </label>
          <input
            type="text"
            value={preferredCurrency}
            onChange={(e) => setPreferredCurrency(e.target.value)}
            className="w-full border border-[#717744]/40 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#717744]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#373D20] mb-1">
            Opening balance
          </label>
          <input
            type="number"
            step="0.01"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
            className="w-full border border-[#717744]/40 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#717744]"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[#5E0B15] text-white font-medium rounded px-4 py-2 hover:bg-[#90323D] transition-colors disabled:opacity-60"
        >
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>

        <p className="text-sm text-[#373D20] text-center">
          Already have an account?{" "}
          <Link to="/login" className="text-[#5E0B15] underline">
            Log in
          </Link>
        </p>
      </form>
    </div>
  )
}

export default Register
