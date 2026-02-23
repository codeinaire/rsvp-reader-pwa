import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// IMPORTANT: Never await WASM init or any async operation before this line.
// documentService starts initializing as a side effect of its import in App.tsx.
// The import button starts disabled and enables when the worker sends Init success.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
