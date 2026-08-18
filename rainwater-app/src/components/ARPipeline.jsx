import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '../contexts/LanguageContext'

export default function ARPipeline() {
  const { t } = useLanguage()
  const [uploadedImages, setUploadedImages] = useState([])
  const [generatedViews, setGeneratedViews] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files)
    setIsUploading(true)
    setError(null)

    files.forEach(file => {
      if (!file.type.startsWith('image/')) {
        setError(t('arPipeline.errorUpload'))
        setIsUploading(false)
        return
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError(t('arPipeline.errorSize'))
        setIsUploading(false)
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        setUploadedImages(prev => [...prev, {
          file: file,
          name: file.name,
          size: file.size,
          preview: e.target.result
        }])
        setIsUploading(false)
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index))
  }

  const generateARViews = async () => {
    if (uploadedImages.length === 0) {
      setError(t('arPipeline.errorNoImages'))
      return
    }

    setIsGenerating(true)
    setError(null)
    setProgress(0)
    setGeneratedViews([])

    try {
      // Generate single comprehensive technical diagram
      setProgress(25)

      // Convert uploaded images to base64 for API
      const imageData = uploadedImages[0].preview // Use first image as primary
      
      // Debug: Log image data info
      console.log('Generating comprehensive rainwater harvesting system diagram...')
      console.log('Image data length:', imageData.length)
      console.log('Image data preview:', imageData.substring(0, 100) + '...')
      console.log('Image file info:', {
        name: uploadedImages[0].name,
        size: uploadedImages[0].size,
        type: uploadedImages[0].file.type
      })

      const prompt = `Analyze this house image and generate a comprehensive technical diagram showing a complete rainwater harvesting system with visible water pipes and components, similar to an architectural blueprint.

      Create a detailed technical diagram with the following rainwater harvesting components:
      
      1. **Rainwater Collection System (Blue Pipes):**
         - Gutters running along all roof edges (highlighted in bright blue)
         - Multiple downspouts extending vertically from gutters
         - First-flush diverters at the base of downspouts (cylindrical units labeled "FIRST-FLUSH DIVERTER")
         - Leaf guards and mesh filters on gutters
      
      2. **Filtration and Treatment (Blue Pipes):**
         - Horizontal blue pipes connecting downspouts to filtration units
         - Rectangular filtration units positioned against house walls (labeled "FILTRATION UNIT")
         - Clear pipe connections showing water flow direction
      
      3. **Storage System (Blue Pipes):**
         - Large cylindrical storage tanks positioned near the house (labeled "STORAGE TANK")
         - Blue pipes connecting filtration units to storage tanks
         - Overflow pipes extending from storage tanks
         - Vents and access points on storage tanks
      
      4. **Distribution System (Blue Pipes):**
         - Blue pipes extending from storage tank bottom
         - Horizontal pipes leading to garden irrigation areas
         - Vertical pipes for home supply connections
         - Pump systems with visible pipe connections
         - Label pipes as "GARDEN USE / HOME SUPPLY"
      
      5. **Groundwater Recharge (Blue Pipes):**
         - Overflow pipes from gutters leading to soak pits
         - Blue pipes extending downward and horizontally to infiltration areas
         - Percolation pits with pipe connections (labeled "OVERFLOW TO SOAK PIT")
         - Rain gardens with native plants and pipe outlets
         - Label soak pit area as "SOAK PIT"
      
      6. **Visual Style Requirements:**
         - Use bright blue lines to represent all water pipes and flow
         - Show the house in grayscale architectural drawing style
         - Make all pipes and components clearly visible and labeled
         - Include technical labels for major components in black text
         - Show water flow direction with blue arrows along pipes
         - Make it look like a professional engineering diagram
         - Include all components in a single comprehensive view
      
      The final image should be a detailed technical diagram showing the complete rainwater harvesting system with all pipes, connections, and components clearly visible in one comprehensive view.`

      // Debug: Log request details
      console.log('Sending request to API...')
      console.log('Request payload size:', JSON.stringify({
        image: imageData.substring(0, 100) + '...',
        prompt: prompt.substring(0, 200) + '...',
        view: 'comprehensive'
      }).length)

      setProgress(50)

      const response = await fetch('http://localhost:3002/api/generate-ar-view', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageData,
          prompt: prompt,
          view: 'comprehensive'
        })
      })

      console.log('API Response status:', response.status)
      console.log('API Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error response:', errorText)
        let errorMessage = `Failed to generate rainwater harvesting diagram: ${response.status}`
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error || errorData.details || errorMessage
        } catch (e) {
          errorMessage = errorText || errorMessage
        }
        throw new Error(errorMessage)
      }

      setProgress(75)

      const result = await response.json()
      console.log('API Response result:', result)
      
      setGeneratedViews([{
        view: 'comprehensive',
        image: result.generatedImage,
        description: result.description
      }])
      setProgress(100)
    } catch (err) {
      console.error('AR generation error:', err)
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      })
      
      let errorMessage = t('arPipeline.errorGeneration')
      if (err.message) {
        errorMessage = err.message
      } else if (err.name === 'TypeError' && err.message.includes('fetch')) {
        errorMessage = 'Cannot connect to the API server. Please make sure the server is running.'
      } else if (err.name === 'SyntaxError') {
        errorMessage = 'Invalid response from server. Please try again.'
      }
      
      setError(errorMessage)
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadImage = (imageData, view) => {
    const link = document.createElement('a')
    link.href = imageData
    link.download = `rainwater-harvesting-${view}-view.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            {t('arPipeline.title')}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t('arPipeline.subtitle')}
          </p>
        </motion.div>

        {/* Upload Section */}
        <motion.div 
          className="bg-white rounded-2xl shadow-lg p-8 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div 
            className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-emerald-500 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            
            <div className="space-y-4">
              <div className="text-6xl">📸</div>
              <h3 className="text-2xl font-semibold text-gray-700">
                {isUploading ? t('arPipeline.uploading') : t('arPipeline.clickToUpload')}
              </h3>
              <p className="text-gray-500">
                {t('arPipeline.uploadHint')}
              </p>
            </div>
          </div>

          {/* Uploaded Images Preview */}
          <AnimatePresence>
            {uploadedImages.length > 0 && (
              <motion.div 
                className="mt-8"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <h4 className="text-lg font-semibold text-gray-700 mb-4">
                  {t('arPipeline.uploadedImages')}
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {uploadedImages.map((image, index) => (
                    <motion.div
                      key={index}
                      className="relative group"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                    >
                      <img 
                        src={image.preview} 
                        alt={`Uploaded ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2 rounded-b-lg">
                        {image.name}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Generate Button */}
          {uploadedImages.length > 0 && (
            <motion.div 
              className="mt-6 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <button
                onClick={generateARViews}
                disabled={isGenerating}
                className={`px-8 py-4 rounded-xl font-bold text-lg shadow-lg transition-all duration-300 flex items-center gap-3 mx-auto ${
                  isGenerating 
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white hover:shadow-xl'
                }`}
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    {t('arPipeline.generating')}
                  </>
                ) : (
                  <>
                    <span className="text-2xl">🚀</span>
                    {t('arPipeline.generateViews')}
                  </>
                )}
              </button>
            </motion.div>
          )}
        </motion.div>

        {/* Progress Bar */}
        {isGenerating && (
          <motion.div 
            className="bg-white rounded-xl shadow-lg p-6 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                {t('arPipeline.progress').replace('{current}', '1').replace('4', '1')}
              </span>
              <span className="text-sm font-medium text-gray-700">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div 
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}

        {/* Error Message */}
        {error && (
          <motion.div 
            className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center">
              <span className="text-red-500 text-xl mr-3">⚠️</span>
              <p className="text-red-700">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Generated Views */}
        <AnimatePresence>
          {generatedViews.length > 0 && (
            <motion.div 
              className="bg-white rounded-2xl shadow-lg p-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                {t('arPipeline.generatedViews')}
              </h2>
              
              <div className="grid grid-cols-1 gap-8">
                {generatedViews.map((view, index) => (
                  <motion.div
                    key={index}
                    className="bg-gray-50 rounded-xl p-6"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-semibold text-gray-800 capitalize">
                        Comprehensive Rainwater Harvesting System
                      </h3>
                      <button
                        onClick={() => downloadImage(view.image, view.view)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <span>📥</span>
                        {t('arPipeline.download')}
                      </button>
                    </div>
                    
                    <div className="bg-white rounded-lg p-4 mb-4">
                      <img 
                        src={view.image} 
                        alt={`Generated ${view.view} view`}
                        className="w-full h-auto rounded-lg shadow-md"
                      />
                    </div>
                    
                    <p className="text-gray-600 text-sm">
                      {view.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* System Components Info */}
        <motion.div 
          className="mt-12 bg-white rounded-2xl shadow-lg p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            {t('arPipeline.systemComponents.title')}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-3">🏠</div>
              <h4 className="font-semibold text-gray-800 mb-2">
                {t('arPipeline.systemComponents.collection')}
              </h4>
              <p className="text-sm text-gray-600">
                Gutters and downspouts collect rainwater from roof surfaces
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-4xl mb-3">💧</div>
              <h4 className="font-semibold text-gray-800 mb-2">
                {t('arPipeline.systemComponents.storage')}
              </h4>
              <p className="text-sm text-gray-600">
                Storage tanks hold collected water for later use
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-4xl mb-3">🔧</div>
              <h4 className="font-semibold text-gray-800 mb-2">
                {t('arPipeline.systemComponents.distribution')}
              </h4>
              <p className="text-sm text-gray-600">
                Pipes and pumps distribute water to gardens and homes
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-4xl mb-3">🌱</div>
              <h4 className="font-semibold text-gray-800 mb-2">
                {t('arPipeline.systemComponents.recharge')}
              </h4>
              <p className="text-sm text-gray-600">
                Overflow systems recharge groundwater naturally
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}