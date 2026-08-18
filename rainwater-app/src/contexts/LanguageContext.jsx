import { createContext, useContext, useState, useEffect } from 'react'

const LanguageContext = createContext()

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    // Get language from localStorage or default to English
    return localStorage.getItem('rainwater-app-language') || 'en'
  })

  const [translations, setTranslations] = useState({})

  // Load translations when language changes
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const translationModule = await import(`../translations/${language}.js`)
        setTranslations(translationModule.default)
      } catch (error) {
        console.error(`Failed to load translations for ${language}:`, error)
        // Fallback to English if translation fails
        if (language !== 'en') {
          const fallbackModule = await import(`../translations/en.js`)
          setTranslations(fallbackModule.default)
        }
      }
    }

    loadTranslations()
  }, [language])

  const changeLanguage = (newLanguage) => {
    setLanguage(newLanguage)
    localStorage.setItem('rainwater-app-language', newLanguage)
  }

  const t = (key, fallback = '') => {
    const keys = key.split('.')
    let value = translations
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        return fallback || key
      }
    }
    
    return value || fallback || key
  }

  const value = {
    language,
    changeLanguage,
    t,
    translations
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}
