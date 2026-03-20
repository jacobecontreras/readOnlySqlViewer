import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { DbViewerProvider } from '@/context/db-viewer-context'

import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DbViewerProvider>
      <App />
    </DbViewerProvider>
  </StrictMode>,
)
