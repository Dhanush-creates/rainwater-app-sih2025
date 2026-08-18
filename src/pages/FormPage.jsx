import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { requestUserGeolocation, saveUserLocation, loadUserLocation } from '../../api/geolocation.js'
import { ACCUWEATHER_API_KEY } from '../utils/api.js'
import { useLanguage } from '../contexts/LanguageContext'
import LocationAutocomplete from '../components/LocationAutocomplete'

export default function FormPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [form, setForm] = useState({
    name: '',
    location: '',
    roofArea: '',
    dwellers: '',
    openSpace: '',
    roofType: 'RCC',
  })
  const [locationStatus, setLocationStatus] = useState('idle') // 'idle', 'requesting', 'success', 'error'
  const [locationError, setLocationError] = useState('')
  const [detectedCity, setDetectedCity] = useState('')

  // Load saved location on component mount
  useEffect(() => {
    const savedLocation = loadUserLocation()
    if (savedLocation) {
      setForm(prev => ({ ...prev, location: `${savedLocation.lat}, ${savedLocation.lon}` }))
      setLocationStatus('success')
    }
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((p) => ({ ...p, [name]: value }))
  }

  const handleGetLocation = async () => {
    setLocationStatus('requesting')
    setLocationError('')
    
    try {
      const coords = await requestUserGeolocation()
      const locationString = `${coords.lat}, ${coords.lon}`
      setForm(prev => ({ ...prev, location: locationString }))
      saveUserLocation(coords)
      
      // Try to resolve a friendly place name using multiple fallback methods
      try {
        let cityName = null
        
        // Method 1: Try AccuWeather API (if key is valid)
        if (ACCUWEATHER_API_KEY) {
          try {
            const base = 'https://dataservice.accuweather.com'
            const url = `${base}/locations/v1/cities/geoposition/search?apikey=${encodeURIComponent(ACCUWEATHER_API_KEY)}&q=${encodeURIComponent(`${coords.lat},${coords.lon}`)}`
            const res = await fetch(url)
            if (res.ok) {
              const data = await res.json()
              const name = data?.EnglishName || data?.LocalizedName
              const region = data?.AdministrativeArea?.EnglishName
              const country = data?.Country?.EnglishName
              if (name) {
                cityName = `${name}${region ? `, ${region}` : ''}${country ? `, ${country}` : ''}`
              }
            }
          } catch (apiError) {
            console.log('AccuWeather API failed, trying fallback methods...')
          }
        }
        
        // Method 2: Try OpenStreetMap Nominatim (free, no API key required)
        if (!cityName) {
          try {
            const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lon}&addressdetails=1`
            const res = await fetch(nominatimUrl, {
              headers: {
                'User-Agent': 'RainwaterApp/1.0'
              }
            })
            if (res.ok) {
              const data = await res.json()
              const address = data.address
              if (address) {
                const city = address.city || address.town || address.village || address.hamlet
                const state = address.state
                const country = address.country
                if (city) {
                  cityName = `${city}${state ? `, ${state}` : ''}${country ? `, ${country}` : ''}`
                }
              }
            }
          } catch (nominatimError) {
            console.log('Nominatim API failed, using coordinates...')
          }
        }
        
        // Method 3: Fallback to coordinates
        if (!cityName) {
          cityName = `Coordinates: ${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`
        }
        
        setDetectedCity(cityName)
      } catch (error) {
        console.log('All location resolution methods failed, using coordinates')
        setDetectedCity(`Coordinates: ${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`)
      }
      
      setLocationStatus('success')
    } catch (error) {
      console.error('Geolocation error:', error)
      setLocationStatus('error')
      if (error.code === 1) {
        setLocationError(t('form.locationDenied'))
      } else if (error.code === 2) {
        setLocationError(t('form.locationUnavailable'))
      } else if (error.code === 3) {
        setLocationError(t('form.locationTimeout'))
      } else {
        setLocationError(t('form.locationError'))
      }
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    navigate('/results', { state: form })
  }

  return (
    <motion.div 
      className="max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Header */}
      <motion.div 
        className="text-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <motion.h2 
          className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent mb-2"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          🏠 {t('form.title')}
        </motion.h2>
        <motion.p 
          className="text-slate-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {t('form.subtitle')}
        </motion.p>
      </motion.div>

      {/* Form */}
      <motion.form 
        onSubmit={handleSubmit} 
        className="space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="grid sm:grid-cols-2 gap-6">
          {/* Name Field */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <label className="block text-sm font-semibold mb-2 text-slate-700">{t('form.name')}</label>
            <motion.input 
              name="name" 
              value={form.name} 
              onChange={handleChange} 
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200" 
              placeholder={t('form.namePlaceholder')}
              required 
              whileFocus={{ scale: 1.02 }}
            />
          </motion.div>

          {/* Location Field */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <label className="block text-sm font-semibold mb-2 text-slate-700">{t('form.location')}</label>
            <div className="flex gap-2">
              <LocationAutocomplete
                value={form.location}
                onChange={(value) => setForm(prev => ({ ...prev, location: value }))}
                placeholder={t('form.locationPlaceholder')}
                className="flex-1 border-2 border-slate-200 rounded-xl px-4 py-3 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
              />
              <motion.button
                type="button"
                onClick={handleGetLocation}
                disabled={locationStatus === 'requesting'}
                className={`px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
                  locationStatus === 'requesting' 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' 
                    : locationStatus === 'success'
                    ? 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200'
                    : 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200'
                }`}
                title={t('form.getLocation')}
                whileHover={{ scale: locationStatus !== 'requesting' ? 1.05 : 1 }}
                whileTap={{ scale: locationStatus !== 'requesting' ? 0.95 : 1 }}
              >
                {locationStatus === 'requesting' ? '⏳' : locationStatus === 'success' ? '✅' : '📍'}
              </motion.button>
            </div>
            <AnimatePresence>
              {locationError && (
                <motion.div 
                  className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-red-500">⚠️</span>
                    <p className="text-xs text-red-600">{locationError}</p>
                  </div>
                  <p className="text-xs text-red-500 mt-1">
                    {t('form.locationManualEntry')}
                  </p>
                </motion.div>
              )}
                  {locationStatus === 'success' && !locationError && (
                <motion.p 
                  className="text-xs text-green-600 mt-2"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {detectedCity}
                </motion.p>
              )}
              {locationStatus === 'idle' && !locationError && (
                <motion.div 
                  className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-blue-500">💡</span>
                    <p className="text-xs text-blue-600">{t('form.locationHint')}</p>
                  </div>
                  <p className="text-xs text-blue-500 mt-1">
                    {t('form.locationApiFallback')}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Roof Area Field */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
          >
            <label className="block text-sm font-semibold mb-2 text-slate-700">{t('form.roofArea')}</label>
            <motion.input 
              type="number" 
              name="roofArea" 
              value={form.roofArea} 
              onChange={handleChange} 
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200" 
              placeholder={t('form.roofAreaPlaceholder')}
              required 
              whileFocus={{ scale: 1.02 }}
            />
          </motion.div>

          {/* Dwellers Field */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
          >
            <label className="block text-sm font-semibold mb-2 text-slate-700">{t('form.dwellers')}</label>
            <motion.input 
              type="number" 
              name="dwellers" 
              value={form.dwellers} 
              onChange={handleChange} 
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200" 
              placeholder={t('form.dwellersPlaceholder')}
              required 
              whileFocus={{ scale: 1.02 }}
            />
          </motion.div>

          {/* Open Space Field */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.9 }}
          >
            <label className="block text-sm font-semibold mb-2 text-slate-700">{t('form.openSpace')}</label>
            <motion.input 
              type="number" 
              name="openSpace" 
              value={form.openSpace} 
              onChange={handleChange} 
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200" 
              placeholder={t('form.openSpacePlaceholder')}
              required 
              whileFocus={{ scale: 1.02 }}
            />
          </motion.div>

          {/* Roof Type Field */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.0 }}
          >
            <label className="block text-sm font-semibold mb-2 text-slate-700">{t('form.roofType')}</label>
            <motion.select 
              name="roofType" 
              value={form.roofType} 
              onChange={handleChange} 
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
              whileFocus={{ scale: 1.02 }}
            >
              <option value="RCC">{t('roofTypes.rcc')}</option>
              <option value="Tiled">{t('roofTypes.tiled')}</option>
              <option value="Metal Sheet">{t('roofTypes.metalSheet')}</option>
            </motion.select>
          </motion.div>
        </div>

        {/* Submit Button */}
        <motion.div 
          className="flex justify-center pt-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
        >
          <motion.button 
            className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-3"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
          >
            <span className="text-xl">🚀</span>
            {t('form.generateAnalysis')}
          </motion.button>
        </motion.div>
      </motion.form>
    </motion.div>
  )
}


