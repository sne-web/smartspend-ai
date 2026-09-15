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
    <div className="min-h-screen flex items-center justify-center bg-warm-cream px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-lg shadow-md p-8 space-y-4 border border-muted-brick/20"
      >
        <h1 className="text-2xl font-bold text-deep-maroon">Log in</h1>

        {error && (
          <p className="text-sm font-medium text-muted-brick bg-muted-brick/10 rounded px-3 py-2">
            {error}
          </p>
        )}

        <div>
          <label className="block text-sm font-medium text-dark-olive mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-sage-olive/40 rounded px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sage-olive"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-olive mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-sage-olive/40 rounded px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sage-olive"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-deep-maroon text-white font-medium rounded px-4 py-2.5 hover:bg-muted-brick transition-colors duration-200 disabled:opacity-60"
        >
          {isSubmitting ? "Logging in..." : "Log in"}
        </button>

        <p className="text-sm text-dark-olive text-center">
          Don't have an account?{" "}
          <Link to="/register" className="text-deep-maroon underline">
            Register
          </Link>
        </p>
      </form>
    </div>
  )
}

export default Login
