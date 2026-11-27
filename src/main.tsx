import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import DevGallery from './DevGallery.tsx'

const gallery = import.meta.env.DEV && new URLSearchParams(window.location.search).has('gallery')

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined)
  })
}

createRoot(document.getElementById('root')!).render(<StrictMode>{gallery ? <DevGallery /> : <App />}</StrictMode>)
