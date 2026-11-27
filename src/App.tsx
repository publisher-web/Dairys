import { useEffect, useState } from 'react'
import { handleRedirect, isConfigured, isLoggedIn } from './dropbox/auth'
import { resolveVaultRoot } from './dropbox/vault'
import { monthKey, toDateString } from './lib/date'
import Calendar from './screens/Calendar'
import Directory, { type DirectoryTab } from './screens/Directory'
import Home from './screens/Home'
import Login from './screens/Login'
import Maintenance from './screens/Maintenance'
import PersonEdit from './screens/PersonEdit'
import PlaceEdit from './screens/PlaceEdit'
import Settings from './screens/Settings'
import Unresolved from './screens/Unresolved'
import Wizard from './screens/Wizard'
import { Glyph, TileIcon } from './ui/Icon'
import StatusBar from './ui/StatusBar'
import { loadDirectory, type Person, type Place } from './vault/directory'

type Screen =
  | { kind: 'home' }
  | { kind: 'settings' }
  | { kind: 'maintenance' }
  | { kind: 'unresolved'; from: 'settings' | 'directory' }
  | { kind: 'directory' }
  | { kind: 'person'; person: Person }
  | { kind: 'place'; place: Place }
  | { kind: 'calendar' }
  | { kind: 'wizard'; date: string; from: 'home' | 'calendar' }

export type VaultState = { kind: 'wait' } | { kind: 'ok' } | { kind: 'ng'; message: string }

const TITLES: Record<Screen['kind'], string> = {
  home: 'Dairys',
  settings: '設定',
  maintenance: 'ノートの整備',
  unresolved: '未登録の名前',
  directory: '人物・場所',
  person: '人物',
  place: '場所',
  calendar: 'カレンダー',
  wizard: 'ふりかえり',
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(isLoggedIn())
  const [screen, setScreen] = useState<Screen>({ kind: 'home' })
  const [tab, setTab] = useState<DirectoryTab>('people')
  const [today] = useState(() => toDateString(new Date()))
  const [month, setMonth] = useState(() => monthKey(today))
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

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [screen])

  const toLogin = () => {
    setLoggedIn(false)
    setVault({ kind: 'wait' })
    setScreen({ kind: 'home' })
  }

  const toHome = () => {
    setHomeKey((k) => k + 1)
    setScreen({ kind: 'home' })
  }

  const back = () => {
    if (screen.kind === 'unresolved') setScreen({ kind: screen.from })
    else if (screen.kind === 'maintenance') setScreen({ kind: 'settings' })
    else if (screen.kind === 'person' || screen.kind === 'place') setScreen({ kind: 'directory' })
    else toHome()
  }

  const showBack = loggedIn && screen.kind !== 'home' && screen.kind !== 'wizard'
  const onHome = loggedIn && screen.kind === 'home'

  return (
    <div className="device">
      <StatusBar />
      <header className="titlebar">
        <div>
          {showBack && (
            <button className="round-button" aria-label="戻る" onClick={back}>
              <Glyph name="chevronLeft" />
            </button>
          )}
          {loggedIn && screen.kind === 'wizard' && (
            <button className="round-button" aria-label="ホームに戻る" onClick={toHome}>
              <Glyph name="home" />
            </button>
          )}
          {onHome && (
            <button className="tile-button" aria-label="人物・場所" onClick={() => setScreen({ kind: 'directory' })}>
              <TileIcon name="people" size={40} />
            </button>
          )}
        </div>
        <h1>{loggedIn ? TITLES[screen.kind] : 'Dairys'}</h1>
        <div className="slot-right">
          {onHome && (
            <button className="tile-button" aria-label="カレンダー" onClick={() => setScreen({ kind: 'calendar' })}>
              <TileIcon name="calendar" size={40} />
            </button>
          )}
          {onHome && (
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
          <Settings
            onLogout={toLogin}
            onOpenUnresolved={() => setScreen({ kind: 'unresolved', from: 'settings' })}
            onOpenDirectory={() => setScreen({ kind: 'directory' })}
            onOpenMaintenance={() => setScreen({ kind: 'maintenance' })}
          />
        ) : screen.kind === 'maintenance' ? (
          <Maintenance />
        ) : screen.kind === 'unresolved' ? (
          <Unresolved />
        ) : screen.kind === 'directory' ? (
          <Directory
            tab={tab}
            onTab={setTab}
            onUnresolved={() => setScreen({ kind: 'unresolved', from: 'directory' })}
            onOpen={(item) => setScreen(item.kind === 'person' ? { kind: 'person', person: item } : { kind: 'place', place: item })}
          />
        ) : screen.kind === 'person' ? (
          <PersonEdit key={screen.person.path} person={screen.person} onDeleted={() => setScreen({ kind: 'directory' })} />
        ) : screen.kind === 'place' ? (
          <PlaceEdit key={screen.place.path} place={screen.place} onDeleted={() => setScreen({ kind: 'directory' })} />
        ) : screen.kind === 'calendar' ? (
          <Calendar vault={vault} today={today} month={month} onMonth={setMonth} onWrite={(date) => setScreen({ kind: 'wizard', date, from: 'calendar' })} />
        ) : screen.kind === 'wizard' ? (
          <Wizard date={screen.date} onExit={screen.from === 'calendar' ? () => setScreen({ kind: 'calendar' }) : toHome} />
        ) : (
          <Home key={homeKey} vault={vault} onStart={(date) => setScreen({ kind: 'wizard', date, from: 'home' })} />
        )}
      </main>
    </div>
  )
}
