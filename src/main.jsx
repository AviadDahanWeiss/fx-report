import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: '#18181b',
          color: '#fff',
          border: '1px solid #3f3f46',
          fontFamily: 'monospace',
          fontSize: '12px',
        },
      }}
    />
  </StrictMode>,
)
