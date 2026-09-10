import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './ui/App'
import { ErrorBoundary } from './ui/components/ErrorBoundary'
import './ui/styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('#root missing from index.html')

createRoot(root).render(
  <StrictMode>
    {/* Outside App on purpose: a boundary cannot catch an error thrown by the component
        it lives in, so anything that took App itself down would render nothing. */}
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
