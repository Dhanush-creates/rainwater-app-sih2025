import React, { useEffect, useRef, useState } from 'react'
import { Loader } from '@googlemaps/js-api-loader'
import { motion } from 'framer-motion'
import { useLanguage } from '../contexts/LanguageContext'

const RooftopAreaCalculator = () => {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const drawingManager = useRef(null)
  const polygon = useRef(null)
  const { t } = useLanguage()
  
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [area, setArea] = useState(0)
  const [isDrawing, setIsDrawing] = useState(false)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    const initMap = async () => {
      try {
        const loader = new Loader({
          apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY_HERE',
          version: 'weekly',
          libraries: ['drawing', 'geometry']
        })

        const google = await loader.load()
        
        // Initialize map
        mapInstance.current = new google.maps.Map(mapRef.current, {
          center: { lat: 12.9716, lng: 77.5946 }, // Default to Bangalore
          zoom: 18,
          mapTypeId: google.maps.MapTypeId.SATELLITE,
          tilt: 45,
          heading: 0
        })

        // Initialize drawing manager
        drawingManager.current = new google.maps.drawing.DrawingManager({
          drawingMode: null,
          drawingControl: false,
          polygonOptions: {
            fillColor: '#00ff00',
            fillOpacity: 0.3,
            strokeColor: '#00ff00',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            clickable: false,
            editable: true,
            zIndex: 1
          }
        })

        drawingManager.current.setMap(mapInstance.current)

        // Listen for polygon completion
        google.maps.event.addListener(drawingManager.current, 'polygoncomplete', (completedPolygon) => {
          if (polygon.current) {
            polygon.current.setMap(null)
          }
          
          polygon.current = completedPolygon
          calculateArea(completedPolygon)
          setIsDrawing(false)
        })

        // Listen for polygon changes
        google.maps.event.addListener(drawingManager.current, 'overlaycomplete', (event) => {
          if (event.type === google.maps.drawing.OverlayType.POLYGON) {
            const newPolygon = event.overlay
            if (polygon.current) {
              polygon.current.setMap(null)
            }
            polygon.current = newPolygon
            calculateArea(newPolygon)
          }
        })

        setIsMapLoaded(true)
      } catch (err) {
        console.error('Error loading Google Maps:', err)
        setError('Failed to load Google Maps. Please check your API key.')
      }
    }

    initMap()
  }, [])

  const calculateArea = (polygon) => {
    if (!polygon) return
    
    const area = google.maps.geometry.spherical.computeArea(polygon.getPath())
    setArea(area)
  }

  const startDrawing = () => {
    if (drawingManager.current) {
      drawingManager.current.setDrawingMode(google.maps.drawing.OverlayType.POLYGON)
      setIsDrawing(true)
    }
  }

  const clearPolygon = () => {
    if (polygon.current) {
      polygon.current.setMap(null)
      polygon.current = null
      setArea(0)
    }
    if (drawingManager.current) {
      drawingManager.current.setDrawingMode(null)
      setIsDrawing(false)
    }
  }

  const formatArea = (areaInSquareMeters) => {
    const squareFeet = areaInSquareMeters * 10.764
    return {
      squareMeters: areaInSquareMeters.toFixed(2),
      squareFeet: squareFeet.toFixed(2)
    }
  }

  const getLocation = () => {
    if (!navigator.geolocation) {
      alert('Error: Your browser doesn\'t support geolocation.')
      return
    }

    // Show loading state
    const button = document.querySelector('[data-location-button]')
    if (button) {
      button.textContent = '📍 Getting Location...'
      button.disabled = true
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // 5 minutes
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }
        
        // Set map center and zoom
        if (mapInstance.current) {
          mapInstance.current.setCenter(pos)
          mapInstance.current.setZoom(20)
          
          // Add a marker to show the detected location
          new google.maps.Marker({
            position: pos,
            map: mapInstance.current,
            title: 'Your Location',
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#4285F4"/>
                </svg>
              `),
              scaledSize: new google.maps.Size(24, 24),
              anchor: new google.maps.Point(12, 12)
            }
          })
        }
        
        // Reset button
        if (button) {
          button.textContent = '📍 My Location'
          button.disabled = false
        }
      },
      (error) => {
        console.error('Geolocation error:', error)
        
        // Reset button
        if (button) {
          button.textContent = '📍 My Location'
          button.disabled = false
        }

        let errorMessage = 'Unable to get your location. '
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Please allow location access in your browser settings and try again.'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable. Please try again.'
            break
          case error.TIMEOUT:
            errorMessage += 'Location request timed out. Please try again.'
            break
          default:
            errorMessage += 'An unknown error occurred.'
            break
        }
        
        // Try IP-based location as fallback
        console.log('GPS failed, trying IP-based location...')
        tryIPLocation()
      },
      options
    )
  }

  const tryIPLocation = () => {
    // Fallback to IP-based location using a free service
    fetch('https://ipapi.co/json/')
      .then(response => response.json())
      .then(data => {
        if (data.latitude && data.longitude) {
          const pos = {
            lat: parseFloat(data.latitude),
            lng: parseFloat(data.longitude)
          }
          
          if (mapInstance.current) {
            mapInstance.current.setCenter(pos)
            mapInstance.current.setZoom(15)
            
            // Add marker for IP-based location
            new google.maps.Marker({
              position: pos,
              map: mapInstance.current,
              title: 'Approximate Location (IP-based)',
              icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#FF9800"/>
                  </svg>
                `),
                scaledSize: new google.maps.Size(24, 24),
                anchor: new google.maps.Point(12, 12)
              }
            })
          }
          
          // Reset button
          const button = document.querySelector('[data-location-button]')
          if (button) {
            button.textContent = '📍 My Location'
            button.disabled = false
          }
          
          alert('Using approximate location. For better accuracy, please use the search function to find your exact address.')
        } else {
          throw new Error('IP location failed')
        }
      })
      .catch(err => {
        console.error('IP location failed:', err)
        
        // Reset button
        const button = document.querySelector('[data-location-button]')
        if (button) {
          button.textContent = '📍 My Location'
          button.disabled = false
        }
        
        alert('Unable to determine your location. Please use the search function to find your address manually.')
      })
  }

  const searchLocation = async () => {
    if (!searchQuery.trim()) return
    
    setIsSearching(true)
    
    try {
      const geocoder = new google.maps.Geocoder()
      geocoder.geocode({ address: searchQuery }, (results, status) => {
        setIsSearching(false)
        
        if (status === 'OK' && results[0]) {
          const location = results[0].geometry.location
          mapInstance.current.setCenter(location)
          mapInstance.current.setZoom(18)
          
          // Add marker for searched location
          new google.maps.Marker({
            position: location,
            map: mapInstance.current,
            title: `Searched: ${searchQuery}`,
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#34A853"/>
                </svg>
              `),
              scaledSize: new google.maps.Size(24, 24),
              anchor: new google.maps.Point(12, 12)
            }
          })
        } else {
          alert(`Location not found: ${searchQuery}. Please try a different address.`)
        }
      })
    } catch (err) {
      setIsSearching(false)
      alert('Search failed. Please try again.')
    }
  }

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      searchLocation()
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('rooftop.mapLoadingError')}</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            {t('rooftop.apiRequirements')}
            <br />• {t('rooftop.mapsApi')}
            <br />• {t('rooftop.drawingLibrary')}
            <br />• {t('rooftop.geometryLibrary')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('rooftop.title')}</h1>
              <p className="text-gray-600 mt-2">{t('rooftop.subtitle')}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  placeholder={t('rooftop.searchPlaceholder')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-64"
                />
                <button
                  onClick={searchLocation}
                  disabled={isSearching || !searchQuery.trim()}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSearching ? `🔍 ${t('rooftop.searching')}` : `🔍 ${t('rooftop.search')}`}
                </button>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={getLocation}
                  data-location-button
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  📍 {t('rooftop.myLocation')}
                </button>
                <button
                  onClick={startDrawing}
                  disabled={isDrawing}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    isDrawing 
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  {isDrawing ? t('rooftop.drawing') : `🎯 ${t('rooftop.startDrawing')}`}
                </button>
                <button
                  onClick={clearPolygon}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  🗑️ {t('rooftop.clear')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Map Container */}
        <div className="flex-1 relative">
          <div 
            ref={mapRef} 
            className="w-full h-[calc(100vh-120px)]"
            style={{ minHeight: '500px' }}
          />
          
          {/* Loading overlay */}
          {!isMapLoaded && (
            <div className="absolute inset-0 bg-white flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">{t('rooftop.loadingMap')}</p>
            </div>
            </div>
          )}

          {/* Instructions overlay */}
          {isMapLoaded && area === 0 && (
            <div className="absolute top-4 left-4 bg-white p-4 rounded-lg shadow-lg max-w-sm">
              <h3 className="font-bold text-gray-800 mb-2">{t('rooftop.instructions.title')}</h3>
              <ol className="text-sm text-gray-600 space-y-1">
                <li>1. Use "Search" to find your address or "My Location" for GPS</li>
                <li>2. {t('rooftop.instructions.step2')}</li>
                <li>3. {t('rooftop.instructions.step3')}</li>
                <li>4. {t('rooftop.instructions.step4')}</li>
                <li>5. {t('rooftop.instructions.step5')}</li>
              </ol>
              <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
                💡 <strong>Tip:</strong> If GPS doesn't work, try searching for your address manually
              </div>
            </div>
          )}
        </div>

        {/* Results Panel */}
        <div className="w-80 bg-white shadow-lg border-l">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">{t('rooftop.areaCalculation')}</h2>
            
            {area > 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="text-2xl font-bold text-green-600 mb-2">
                    {formatArea(area).squareMeters} m²
                  </div>
                  <div className="text-lg text-green-700">
                    {formatArea(area).squareFeet} ft²
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="font-bold text-blue-800 mb-2">{t('rooftop.rainwaterPotential')}</h3>
                  <div className="text-sm text-blue-700 space-y-1">
                    <div>{t('rooftop.annualRainfall')}</div>
                    <div className="font-bold">
                      {t('rooftop.potentialCollection')} {(area * 1).toFixed(2)} {t('rooftop.litersPerYear')}
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <h3 className="font-bold text-yellow-800 mb-2">{t('rooftop.tankRecommendation')}</h3>
                  <div className="text-sm text-yellow-700">
                    {t('rooftop.threeMonthsStorage')} {(area * 0.25).toFixed(2)} {t('rooftop.liters')}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <div className="text-4xl mb-4">🏠</div>
                <p>{t('rooftop.drawPrompt')}</p>
              </div>
            )}

            <div className="mt-6 pt-6 border-t">
              <h3 className="font-bold text-gray-800 mb-3">{t('rooftop.tips.title')}</h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• {t('rooftop.tips.tip1')}</li>
                <li>• {t('rooftop.tips.tip2')}</li>
                <li>• {t('rooftop.tips.tip3')}</li>
                <li>• {t('rooftop.tips.tip4')}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RooftopAreaCalculator
