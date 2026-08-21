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

// Инициализация Telegram Web App (по ТЗ, Часть 5).
// ВАЖНО: никогда не должна ронять рендер — вне Telegram WebView
// (браузер, туннель, превью) SDK может кидать. try/catch + сам
// initTelegram() уже полностью деградирует.
try {
  initTelegram()
} catch {
  /* Telegram SDK недоступен — рендеримся без него, UI покажет заглушку */
}

/** Страховка от пустого экрана: любая ошибка рендера → сообщение, не белая страница */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '40px 20px',
            fontFamily: 'Montserrat, sans-serif',
            textAlign: 'center',
            color: '#2A2521',
            background: '#F9F8F6',
            minHeight: '100vh',
            boxSizing: 'border-box',
          }}
        >
          <h1 style={{ fontSize: 20, margin: '0 0 12px' }}>Что-то пошло не так</h1>
          <p style={{ fontSize: 14, margin: 0 }}>
            Перезапустите приложение из Telegram. Если ошибка повторяется — напишите в поддержку GAZE.
          </p>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
