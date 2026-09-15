import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

function AppHeader({ active }: { active: "dashboard" | "transactions" }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate("/login")
  }

  function linkClass(page: "dashboard" | "transactions") {
    return `hover:text-white transition-colors duration-200 ${active === page ? "text-white font-semibold" : "text-white/80"}`
  }

  return (
    <header className="bg-deep-maroon px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="flex items-center gap-3 sm:gap-6">
        <h1 className="text-lg sm:text-xl font-bold text-white whitespace-nowrap">SmartSpend AI</h1>
        <nav className="flex items-center gap-3 sm:gap-4 text-sm">
          <Link to="/dashboard" className={linkClass("dashboard")}>
            Dashboard
          </Link>
          <Link to="/transactions" className={linkClass("transactions")}>
            Transactions
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-white/80 text-sm hidden sm:inline">{user?.email}</span>
        <button
          onClick={handleLogout}
          className="bg-muted-brick text-white font-medium rounded px-4 py-2.5 hover:bg-[#a13c48] transition-colors duration-200"
        >
          Log out
        </button>
      </div>
    </header>
  )
}

export default AppHeader
