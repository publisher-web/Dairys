import { useEffect, useState } from 'react'
import Spike from './Spike'
import { handleRedirect, isConfigured, isLoggedIn } from './dropbox/auth'
import Home from './screens/Home'
import Login from './screens/Login'
import Settings from './screens/Settings'

type Screen = 'home' | 'settings' | 'spike'

export default function App() {
  const [loggedIn, setLoggedIn] = useState(isLoggedIn())
  const [screen, setScreen] = useState<Screen>('home')
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
    setScreen('home')
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
        {loggedIn && (
          <button className="icon-button" aria-label={screen === 'home' ? 'せってい' : 'もどる'} onClick={() => setScreen(screen === 'home' ? 'settings' : 'home')}>
            {screen === 'home' ? '⚙️' : '🏠'}
          </button>
        )}
      </header>
      {!isConfigured() ? (
        <p className="error">Dropbox の App key が未設定です（src/config.ts）。</p>
      ) : !loggedIn ? (
        <Login error={error} />
      ) : screen === 'settings' ? (
        <Settings onLogout={toLogin} onOpenSpike={() => setScreen('spike')} />
      ) : screen === 'spike' ? (
        <Spike onLogout={toLogin} />
      ) : (
        <Home />
      )}
      <p className="footer-note">Dairys · 夜のふりかえり日記</p>
    </main>
  )
}
