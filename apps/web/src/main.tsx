import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './app/App'
import 'ol/ol.css'
import './styles/tokens.css'
import './styles/theme-miljodirektoratet.css'
import './styles/layout.css'
import './styles/global.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Fant ikke rot-elementet for applikasjonen')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
