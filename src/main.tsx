import React from 'react'
import ReactDOM from 'react-dom/client'

import '@fontsource/montserrat/400.css'
import '@fontsource/montserrat/500.css'
import '@fontsource/montserrat/600.css'
import '@fontsource/montserrat/700.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/700.css'

import './styles/tokens.css'
import './styles/index.css'

import App from './App'
import { initTelegram } from './lib/telegram'

// Инициализация Telegram Web App (по ТЗ, Часть 5)
initTelegram()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
