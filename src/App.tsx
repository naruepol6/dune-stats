import { useState } from 'react'
import { Link, NavLink, Route, Routes } from 'react-router-dom'
import { useTheme } from './lib/theme'
import { CloseIcon, MenuIcon, MoonIcon, SunIcon } from './components/icons'
import Leaderboard from './pages/Leaderboard'
import GameLog from './pages/GameLog'
import EnterGame from './pages/EnterGame'
import PlayerProfile from './pages/PlayerProfile'
import LeaderList from './pages/LeaderList'
import LeaderDetail from './pages/LeaderDetail'
import Roster from './pages/Roster'

const NAV_LINKS = [
  { to: '/', label: 'Leaderboard', end: true },
  { to: '/leaders', label: 'Leaders', end: false },
  { to: '/games', label: 'Games', end: false },
  { to: '/roster', label: 'Roster', end: false },
]

function Nav() {
  const { theme, toggle } = useTheme()
  const [open, setOpen] = useState(false)

  const inlineLink = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
      isActive
        ? 'bg-cyan-600 text-white'
        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
    }`
  const menuLink = ({ isActive }: { isActive: boolean }) =>
    `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
      isActive
        ? 'bg-cyan-600 text-white'
        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
    }`

  return (
    <nav className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-3xl items-center gap-1 px-3 py-2">
        <Link
          to="/"
          className="flex items-center gap-1.5 font-semibold tracking-tight text-slate-900 dark:text-slate-100"
        >
          <img src="/favicon.svg" alt="" className="h-5 w-5" />
          <span>Ice Dune</span>
        </Link>

        {/* Desktop: inline links */}
        <div className="ml-auto hidden items-center gap-0.5 sm:flex">
          {NAV_LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={inlineLink}>
              {l.label}
            </NavLink>
          ))}
          <NavLink
            to="/enter"
            className="rounded-lg bg-cyan-600 px-2.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-cyan-700"
          >
            + Add
          </NavLink>
          <button
            type="button"
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="inline-flex items-center rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
          </button>
        </div>

        {/* Mobile: dropdown menu */}
        <div className="relative ml-auto sm:hidden">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
            aria-expanded={open}
            className="inline-flex items-center rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {open ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </button>
          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute right-0 z-20 mt-1 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-slate-900">
                {NAV_LINKS.map((l) => (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    end={l.end}
                    className={menuLink}
                    onClick={() => setOpen(false)}
                  >
                    {l.label}
                  </NavLink>
                ))}
                <NavLink to="/enter" className={menuLink} onClick={() => setOpen(false)}>
                  + Add game
                </NavLink>
                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                <button
                  type="button"
                  onClick={toggle}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {theme === 'dark' ? (
                    <>
                      <SunIcon className="h-4 w-4" /> Light mode
                    </>
                  ) : (
                    <>
                      <MoonIcon className="h-4 w-4" /> Dark mode
                    </>
                  )}
                </button>
              </div>
            </>
          )}
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
