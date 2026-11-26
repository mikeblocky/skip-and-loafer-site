import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App'
import { currentLang, loadLang } from './i18n'

// a non-English visitor waits for their words, so the page doesn't flash English first
loadLang(currentLang()).finally(() => createRoot(document.getElementById('root')!).render(<App />))
