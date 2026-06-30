import { NavLink, Route, Routes } from 'react-router-dom'
import Leaderboard from './pages/Leaderboard'
import GameLog from './pages/GameLog'
import EnterGame from './pages/EnterGame'
import PlayerProfile from './pages/PlayerProfile'
import LeaderList from './pages/LeaderList'
import LeaderDetail from './pages/LeaderDetail'
import Roster from './pages/Roster'

function Nav() {
  const link = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 text-sm font-medium rounded ${
      isActive ? 'bg-amber-600 text-white' : 'text-gray-700 hover:bg-amber-100'
    }`
  return (
    <nav className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b bg-white px-3 py-2 shadow-sm">
      <span className="mr-2 font-bold text-amber-700">Dune Stats</span>
      <NavLink to="/" end className={link}>
        Leaderboard
      </NavLink>
      <NavLink to="/leaders" className={link}>
        Leaders
      </NavLink>
      <NavLink to="/games" className={link}>
        Games
      </NavLink>
      <NavLink to="/roster" className={link}>
        Roster
      </NavLink>
      <NavLink to="/enter" className={({ isActive }) => `${link({ isActive })} ml-auto bg-amber-600 text-white`}>
        + Add game
      </NavLink>
    </nav>
  )
}

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Nav />
      <main className="mx-auto max-w-3xl p-3 sm:p-4">
        <Routes>
          <Route path="/" element={<Leaderboard />} />
          <Route path="/games" element={<GameLog />} />
          <Route path="/enter" element={<EnterGame />} />
          <Route path="/games/:id/edit" element={<EnterGame />} />
          <Route path="/players/:id" element={<PlayerProfile />} />
          <Route path="/leaders" element={<LeaderList />} />
          <Route path="/leaders/:id" element={<LeaderDetail />} />
          <Route path="/roster" element={<Roster />} />
          <Route path="*" element={<p className="p-4">Not found.</p>} />
        </Routes>
      </main>
    </div>
  )
}
