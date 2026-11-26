import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import DevGallery from './DevGallery.tsx'

const gallery = import.meta.env.DEV && new URLSearchParams(window.location.search).has('gallery')

createRoot(document.getElementById('root')!).render(<StrictMode>{gallery ? <DevGallery /> : <App />}</StrictMode>)
