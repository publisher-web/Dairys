import { useEffect, useState } from 'react'
import Spike from './Spike'
import { handleRedirect, isConfigured, isLoggedIn, startLogin } from './dropbox/auth'

export default function App() {
  const [loggedIn, setLoggedIn] = useState(isLoggedIn())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    handleRedirect()
      .then((done) => {
        if (done) setLoggedIn(true)
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  return (
    <main className="app">
      <h1>Dairys</h1>
      {error && <p className="error">{error}</p>}
      {!isConfigured() ? (
        <p>Dropbox の App key が未設定です（src/config.ts）。</p>
      ) : loggedIn ? (
        <Spike onLogout={() => setLoggedIn(false)} />
      ) : (
        <button onClick={() => startLogin()}>Dropbox でログイン</button>
      )}
    </main>
  )
}
