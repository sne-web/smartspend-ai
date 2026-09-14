import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await login(email, password)
      navigate("/dashboard")
    } catch {
      setError("Invalid email or password.")
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
        <h1 className="text-2xl font-bold text-[#5E0B15]">Log in</h1>

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

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[#5E0B15] text-white font-medium rounded px-4 py-2 hover:bg-[#90323D] transition-colors disabled:opacity-60"
        >
          {isSubmitting ? "Logging in..." : "Log in"}
        </button>

        <p className="text-sm text-[#373D20] text-center">
          Don't have an account?{" "}
          <Link to="/register" className="text-[#5E0B15] underline">
            Register
          </Link>
        </p>
      </form>
    </div>
  )
}

export default Login
