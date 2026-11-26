import { useEffect, useState } from 'react'
import Spike from './Spike'
import { handleRedirect, isConfigured, isLoggedIn } from './dropbox/auth'
import { resolveVaultRoot } from './dropbox/vault'
import Home from './screens/Home'
import Login from './screens/Login'
import Settings from './screens/Settings'
import Wizard from './screens/Wizard'
import { Glyph, TileIcon } from './ui/Icon'
import StatusBar from './ui/StatusBar'

type Screen = { kind: 'home' } | { kind: 'settings' } | { kind: 'spike' } | { kind: 'wizard'; date: string }

export type VaultState = { kind: 'wait' } | { kind: 'ok' } | { kind: 'ng'; message: string }

const TITLES: Record<Screen['kind'], string> = { home: 'Dairys', settings: '設定', spike: '技術検証', wizard: 'ふりかえり' }

export default function App() {
  const [loggedIn, setLoggedIn] = useState(isLoggedIn())
  const [screen, setScreen] = useState<Screen>({ kind: 'home' })
  const [homeKey, setHomeKey] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [vault, setVault] = useState<VaultState>({ kind: 'wait' })

  useEffect(() => {
    handleRedirect()
      .then((done) => {
        if (done) setLoggedIn(true)
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  useEffect(() => {
    if (!loggedIn) return
    resolveVaultRoot()
      .then(() => setVault({ kind: 'ok' }))
      .catch((e: unknown) => setVault({ kind: 'ng', message: e instanceof Error ? e.message : String(e) }))
  }, [loggedIn])

  const toLogin = () => {
    setLoggedIn(false)
    setVault({ kind: 'wait' })
    setScreen({ kind: 'home' })
  }

  const toHome = () => {
    setHomeKey((k) => k + 1)
    setScreen({ kind: 'home' })
  }

  const showBack = loggedIn && (screen.kind === 'settings' || screen.kind === 'spike')
  const showSettings = loggedIn && screen.kind === 'home'

  return (
    <div className="device">
      <StatusBar connected={loggedIn ? vault.kind === 'ok' : null} />
      <header className="titlebar">
        <div>
          {showBack && (
            <button className="round-button" aria-label="戻る" onClick={() => (screen.kind === 'spike' ? setScreen({ kind: 'settings' }) : toHome())}>
              <Glyph name="chevronLeft" />
            </button>
          )}
        </div>
        <h1>{loggedIn ? TITLES[screen.kind] : 'Dairys'}</h1>
        <div className="slot-right">
          {showSettings && (
            <button className="tile-button" aria-label="設定" onClick={() => setScreen({ kind: 'settings' })}>
              <TileIcon name="gear" size={40} />
            </button>
          )}
        </div>
      </header>
      <main className="content">
        {!isConfigured() ? (
          <p className="error">Dropbox の App key が設定されていません（src/config.ts）。</p>
        ) : !loggedIn ? (
          <Login error={error} />
        ) : screen.kind === 'settings' ? (
          <Settings onLogout={toLogin} onOpenSpike={() => setScreen({ kind: 'spike' })} />
        ) : screen.kind === 'spike' ? (
          <Spike onLogout={toLogin} />
        ) : screen.kind === 'wizard' ? (
          <Wizard date={screen.date} onExit={toHome} />
        ) : (
          <Home key={homeKey} vault={vault} onStart={(date) => setScreen({ kind: 'wizard', date })} />
        )}
        <p className="footnote">Dairys</p>
      </main>
    </div>
  )
}
