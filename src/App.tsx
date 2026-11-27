import { useEffect, useState } from 'react'
import { handleRedirect, isConfigured, isLoggedIn } from './dropbox/auth'
import { resolveVaultRoot } from './dropbox/vault'
import Home from './screens/Home'
import Login from './screens/Login'
import Settings from './screens/Settings'
import Unresolved from './screens/Unresolved'
import Wizard from './screens/Wizard'
import { Glyph, TileIcon } from './ui/Icon'
import StatusBar from './ui/StatusBar'
import { loadDirectory } from './vault/directory'

type Screen = { kind: 'home' } | { kind: 'settings' } | { kind: 'unresolved' } | { kind: 'wizard'; date: string }

export type VaultState = { kind: 'wait' } | { kind: 'ok' } | { kind: 'ng'; message: string }

const TITLES: Record<Screen['kind'], string> = { home: 'Dairys', settings: '設定', unresolved: '未登録の名前', wizard: 'ふりかえり' }

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
      .then(() => {
        setVault({ kind: 'ok' })
        loadDirectory()
      })
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

  const showBack = loggedIn && (screen.kind === 'settings' || screen.kind === 'unresolved')
  const showSettings = loggedIn && screen.kind === 'home'

  return (
    <div className="device">
      <StatusBar />
      <header className="titlebar">
        <div>
          {showBack && (
            <button className="round-button" aria-label="戻る" onClick={() => (screen.kind === 'unresolved' ? setScreen({ kind: 'settings' }) : toHome())}>
              <Glyph name="chevronLeft" />
            </button>
          )}
          {loggedIn && screen.kind === 'wizard' && (
            <button className="round-button" aria-label="ホームに戻る" onClick={toHome}>
              <Glyph name="home" />
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
          <Settings onLogout={toLogin} onOpenUnresolved={() => setScreen({ kind: 'unresolved' })} />
        ) : screen.kind === 'unresolved' ? (
          <Unresolved />
        ) : screen.kind === 'wizard' ? (
          <Wizard date={screen.date} onExit={toHome} />
        ) : (
          <Home key={homeKey} vault={vault} onStart={(date) => setScreen({ kind: 'wizard', date })} />
        )}
      </main>
    </div>
  )
}
