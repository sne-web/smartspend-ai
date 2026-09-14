import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate("/login")
  }

  return (
    <div className="min-h-screen bg-[#D9CAB3] flex flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-2xl font-bold text-[#5E0B15]">Welcome, {user?.email}</h1>
      <button
        onClick={handleLogout}
        className="bg-[#5E0B15] text-white font-medium rounded px-4 py-2 hover:bg-[#90323D] transition-colors"
      >
        Log out
      </button>
    </div>
  )
}

export default Dashboard
