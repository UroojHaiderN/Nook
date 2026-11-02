import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/fredoka'
import '@fontsource-variable/nunito'
import './index.css'
import App from './App.tsx'
import Boundary from './components/Boundary'
import { AuthProvider } from './auth'
import { BoardProvider } from './store'
import { hideSplash } from './splash'

/*
 * A new deploy installs a new service worker, but the page you are looking at
 * was already built from the old one — so without this you would keep seeing
 * the previous version until you reloaded a second time. When the new worker
 * takes over, reload once so the update is invisible rather than confusing.
 *
 * `hadController` guards the very first visit, where the worker claiming the
 * page is normal and there is nothing stale to replace.
 */
declare const __BUILD__: string
document.documentElement.dataset.build = __BUILD__

if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller
  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return
    reloading = true
    window.location.reload()
  })
}

// Whatever happens, the splash never outstays a slow network by much.
window.setTimeout(() => hideSplash(true), 6000)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Boundary>
      <AuthProvider>
        <BoardProvider>
          <App />
        </BoardProvider>
      </AuthProvider>
    </Boundary>
  </StrictMode>,
)
