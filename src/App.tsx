import { Link, NavLink, Route, Routes } from 'react-router-dom'
import { useTheme } from './lib/theme'
import { MoonIcon, SunIcon } from './components/icons'
import Leaderboard from './pages/Leaderboard'
import GameLog from './pages/GameLog'
import EnterGame from './pages/EnterGame'
import PlayerProfile from './pages/PlayerProfile'
import LeaderList from './pages/LeaderList'
import LeaderDetail from './pages/LeaderDetail'
import Roster from './pages/Roster'

function Nav() {
  const { theme, toggle } = useTheme()
  const link = ({ isActive }: { isActive: boolean }) =>
    `shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
      isActive
        ? 'bg-cyan-600 text-white'
        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
    }`
  return (
    <nav className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-3xl items-center gap-0.5 overflow-x-auto px-2 py-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Link
          to="/"
          className="mr-1 flex shrink-0 items-center gap-1.5 font-semibold tracking-tight text-slate-900 dark:text-slate-100"
        >
          <img src="/favicon.svg" alt="" className="h-5 w-5" />
          <span className="hidden sm:inline">Ice Dune</span>
        </Link>
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
        <div className="ml-auto flex shrink-0 items-center gap-0.5 pl-1">
          <NavLink
            to="/enter"
            className="shrink-0 rounded-lg bg-cyan-600 px-2.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-cyan-700"
          >
            + Add
          </NavLink>
          <button
            type="button"
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="inline-flex shrink-0 items-center rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </nav>
  )
}

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
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
