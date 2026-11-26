import { useEffect, useState } from 'react'
import Spike from './Spike'
import { handleRedirect, isConfigured, isLoggedIn } from './dropbox/auth'
import Home from './screens/Home'
import Login from './screens/Login'
import Settings from './screens/Settings'
import Wizard from './screens/Wizard'

type Screen = { kind: 'home' } | { kind: 'settings' } | { kind: 'spike' } | { kind: 'wizard'; date: string }

export default function App() {
  const [loggedIn, setLoggedIn] = useState(isLoggedIn())
  const [screen, setScreen] = useState<Screen>({ kind: 'home' })
  const [homeKey, setHomeKey] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    handleRedirect()
      .then((done) => {
        if (done) setLoggedIn(true)
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  const toLogin = () => {
    setLoggedIn(false)
    setScreen({ kind: 'home' })
  }

  const toHome = () => {
    setHomeKey((k) => k + 1)
    setScreen({ kind: 'home' })
  }

  return (
    <main className="app">
      <header className="topbar">
        <h1 className="logo">
          <span className="logo-mark" aria-hidden="true">
            🌱
          </span>
          Dairys
        </h1>
        {loggedIn && screen.kind !== 'wizard' && (
          <button className="icon-button" aria-label={screen.kind === 'home' ? 'せってい' : 'もどる'} onClick={() => (screen.kind === 'home' ? setScreen({ kind: 'settings' }) : toHome())}>
            {screen.kind === 'home' ? '⚙️' : '🏠'}
          </button>
        )}
      </header>
      {!isConfigured() ? (
        <p className="error">Dropbox の App key が未設定です（src/config.ts）。</p>
      ) : !loggedIn ? (
        <Login error={error} />
      ) : screen.kind === 'settings' ? (
        <Settings onLogout={toLogin} onOpenSpike={() => setScreen({ kind: 'spike' })} />
      ) : screen.kind === 'spike' ? (
        <Spike onLogout={toLogin} />
      ) : screen.kind === 'wizard' ? (
        <Wizard date={screen.date} onExit={toHome} />
      ) : (
        <Home key={homeKey} onStart={(date) => setScreen({ kind: 'wizard', date })} />
      )}
      <p className="footer-note">Dairys · 夜のふりかえり日記</p>
    </main>
  )
}
