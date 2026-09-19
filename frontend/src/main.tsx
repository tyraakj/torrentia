import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/apfel-grotezk/400.css'
import '@fontsource/apfel-grotezk/700.css'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
