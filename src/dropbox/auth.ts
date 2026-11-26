import { DROPBOX_APP_KEY, REDIRECT_URI } from '../config'

const TOKEN_URL = 'https://api.dropboxapi.com/oauth2/token'
const AUTHORIZE_URL = 'https://www.dropbox.com/oauth2/authorize'
const VERIFIER_KEY = 'dairys.pkce.verifier'
const STATE_KEY = 'dairys.pkce.state'
const TOKEN_KEY = 'dairys.dropbox.token'

type StoredToken = {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

type TokenResponse = {
  access_token: string
  refresh_token?: string
  expires_in: number
}

function base64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function randomString(byteLength: number): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(byteLength)))
}

async function sha256Base64Url(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return base64Url(new Uint8Array(digest))
}

function readToken(): StoredToken | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY)
    return raw ? (JSON.parse(raw) as StoredToken) : null
  } catch {
    return null
  }
}

function writeToken(token: StoredToken | null) {
  if (token) localStorage.setItem(TOKEN_KEY, JSON.stringify(token))
  else localStorage.removeItem(TOKEN_KEY)
}

async function requestToken(params: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: DROPBOX_APP_KEY, ...params }),
  })
  if (!res.ok) throw new Error(`token ${res.status}: ${await res.text()}`)
  return (await res.json()) as TokenResponse
}

export function isConfigured(): boolean {
  return DROPBOX_APP_KEY.length > 0
}

export function isLoggedIn(): boolean {
  return readToken() !== null
}

export async function startLogin(): Promise<void> {
  const verifier = randomString(64)
  const state = randomString(16)
  localStorage.setItem(VERIFIER_KEY, verifier)
  localStorage.setItem(STATE_KEY, state)
  const url = new URL(AUTHORIZE_URL)
  url.search = new URLSearchParams({
    client_id: DROPBOX_APP_KEY,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    code_challenge: await sha256Base64Url(verifier),
    code_challenge_method: 'S256',
    token_access_type: 'offline',
    state,
  }).toString()
  window.location.assign(url.toString())
}

export async function handleRedirect(): Promise<boolean> {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const error = params.get('error')
  if (!code && !error) return false
  window.history.replaceState(null, '', REDIRECT_URI)
  if (error) throw new Error(`authorize: ${error} ${params.get('error_description') ?? ''}`)
  const verifier = localStorage.getItem(VERIFIER_KEY)
  const state = localStorage.getItem(STATE_KEY)
  localStorage.removeItem(VERIFIER_KEY)
  localStorage.removeItem(STATE_KEY)
  if (!verifier || params.get('state') !== state) throw new Error('authorize: state mismatch')
  const res = await requestToken({
    grant_type: 'authorization_code',
    code: code!,
    code_verifier: verifier,
    redirect_uri: REDIRECT_URI,
  })
  if (!res.refresh_token) throw new Error('authorize: refresh_token missing')
  writeToken({
    accessToken: res.access_token,
    refreshToken: res.refresh_token,
    expiresAt: Date.now() + (res.expires_in - 60) * 1000,
  })
  return true
}

export async function getAccessToken(): Promise<string> {
  const token = readToken()
  if (!token) throw new Error('not logged in')
  if (Date.now() < token.expiresAt) return token.accessToken
  const res = await requestToken({ grant_type: 'refresh_token', refresh_token: token.refreshToken })
  const next = {
    accessToken: res.access_token,
    refreshToken: res.refresh_token ?? token.refreshToken,
    expiresAt: Date.now() + (res.expires_in - 60) * 1000,
  }
  writeToken(next)
  return next.accessToken
}

export function logout() {
  writeToken(null)
}
