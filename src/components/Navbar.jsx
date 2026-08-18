import { Link, NavLink } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '../contexts/LanguageContext'

export default function Navbar() {
  const { language, changeLanguage, t } = useLanguage()
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false)
  const menuRef = useRef(null)

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
    { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' }
  ]

  const currentLanguage = languages.find(lang => lang.code === language) || languages[0]

  const handleLanguageChange = (langCode) => {
    changeLanguage(langCode)
    setIsLanguageMenuOpen(false)
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsLanguageMenuOpen(false)
      }
    }

    if (isLanguageMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isLanguageMenuOpen])

  return (
    <header className="border-b bg-white/70 backdrop-blur sticky top-0 z-10">
      <div className="container-page flex items-center justify-between py-4">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-500 to-sky-500 flex items-center justify-center text-white font-bold shadow">RW</div>
          <span className="font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors">Rainwater</span>
        </Link>

        <nav className="flex items-center gap-6">
          <NavLink to="/" className={({isActive}) => `pb-1 hover:text-emerald-600 ${isActive ? 'text-emerald-600 border-b-2 border-emerald-500' : ''}`}>
            {t('nav.home')}
          </NavLink>
          <NavLink to="/about" className={({isActive}) => `pb-1 hover:text-emerald-600 ${isActive ? 'text-emerald-600 border-b-2 border-emerald-500' : ''}`}>
            {t('nav.about')}
          </NavLink>
          <NavLink to="/form" className={({isActive}) => `pb-1 hover:text-emerald-600 ${isActive ? 'text-emerald-600 border-b-2 border-emerald-500' : ''}`}>
            {t('nav.start')}
          </NavLink>
        </nav>

        {/* Language Switcher */}
        <div className="relative" ref={menuRef}>
          <button
            className="px-3 py-2 rounded-full border text-sm hover:bg-emerald-50 flex items-center gap-2 transition-colors"
            onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
            aria-label="Change language"
          >
            <span className="text-lg">{currentLanguage.flag}</span>
            <span>{currentLanguage.name}</span>
            <span className="text-xs">▼</span>
          </button>

          {isLanguageMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border py-2 z-20">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  className={`w-full px-4 py-2 text-left hover:bg-emerald-50 flex items-center gap-3 transition-colors ${
                    language === lang.code ? 'bg-emerald-100 text-emerald-700' : 'text-slate-700'
                  }`}
                  onClick={() => handleLanguageChange(lang.code)}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span className="font-medium">{lang.name}</span>
                  {language === lang.code && <span className="ml-auto text-emerald-600">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}


