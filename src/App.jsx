import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LanguageProvider, useLanguage } from './contexts/LanguageContext'
import ErrorBoundary from './components/ErrorBoundary'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import FormPage from './pages/FormPage'
import ResultsPage from './pages/ResultsPage'
import About from './pages/About'

function AppContent() {
  const { t } = useLanguage()
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container-page py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/form" element={<FormPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </main>
      <footer className="border-t py-6 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} {t('footer.copyright')}
      </footer>
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </LanguageProvider>
    </ErrorBoundary>
  )
}

export default App
