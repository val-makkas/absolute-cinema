import './assets/main.css'
import 'non.geist'
import 'non.geist/mono'

import { createRoot } from 'react-dom/client'
import App from './App'
import { HashRouter } from 'react-router-dom'

document.documentElement.classList.add('dark')
document.body.classList.add('bg-background', 'text-foreground', 'min-h-screen', 'antialiased')

createRoot(document.getElementById('root')!).render(
  <HashRouter>
    <App />
  </HashRouter>
)
