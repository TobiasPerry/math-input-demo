import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import MathWhiteboard from './components/MathWhiteboard'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MathWhiteboard />
  </StrictMode>,
)

