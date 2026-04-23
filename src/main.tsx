import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { DbViewerProvider } from '@/context/db-viewer-context'

import './index.css'
import App from './App.tsx'

const rootElement = document.getElementById('root')!

// Remove the static SEO fallback markup inside #root before React takes over
// so crawlers see the pre-hydration content but real users don't get a flash
// of it stacked behind the live UI.
rootElement.replaceChildren()

createRoot(rootElement).render(
  <StrictMode>
    <DbViewerProvider>
      <App />
    </DbViewerProvider>
  </StrictMode>,
)
