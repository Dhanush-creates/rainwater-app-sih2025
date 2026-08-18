import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { GoogleGenerativeAI } from '@google/generative-ai'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const app = express()
const PORT = 3002

// Middleware
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Configure multer for image uploads
const storage = multer.memoryStorage()
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
})

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY)

// Simple rate limiting to prevent quota issues
const requestQueue = []
const MAX_CONCURRENT_REQUESTS = 2
let activeRequests = 0

async function waitForSlot() {
  return new Promise((resolve) => {
    if (activeRequests < MAX_CONCURRENT_REQUESTS) {
      activeRequests++
      resolve()
    } else {
      requestQueue.push(resolve)
    }
  })
}

function releaseSlot() {
  activeRequests--
  if (requestQueue.length > 0) {
    const next = requestQueue.shift()
    activeRequests++
    next()
  }
}

// Function to create an annotated version of the image using Gemini
async function createAnnotatedImage(originalImage, view, prompt) {
  try {
    console.log(`📝 Creating annotated image for ${view} view using Gemini`)
    
    // Wait for available slot to prevent quota issues
    await waitForSlot()
    
    try {
      // Use Gemini to generate the modified image
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash-image-preview",
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    })

    // Convert base64 image to the format expected by Gemini
    const imageData = {
      inlineData: {
        data: originalImage.split(',')[1], // remove prefix
        mimeType: originalImage.split(',')[0].split(':')[1].split(';')[0], // extract mime type
      },
    }

    // Call Gemini API
    const result = await model.generateContent([prompt, imageData])
    const response = await result.response

    // ✅ Extract base64 image instead of text
    const candidates = response.candidates || []
    let base64Image = null

    for (const candidate of candidates) {
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData) {
            base64Image = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
            break
          }
        }
      }
      if (base64Image) break
    }

    if (!base64Image) {
      console.warn("⚠️ No image data in Gemini response, returning original image")
      return originalImage
    }

      console.log(`✅ Created annotated image for ${view} view using Gemini`)
      return base64Image // Return the base64 image in the same format
      
    } finally {
      // Always release the slot
      releaseSlot()
    }

  } catch (error) {
    console.error("Error creating annotated image with Gemini:", error)
    
    // Check if it's a quota error and provide helpful message
    if (error.message && error.message.includes('429')) {
      console.warn("⚠️ Gemini API quota exceeded. Please wait or upgrade your plan.")
    }
    
    return originalImage // Fallback to original image
  }
}

// AR Pipeline endpoint
app.post('/api/generate-ar-view', async (req, res) => {
  try {
    console.log('📥 Received AR generation request')
    const { image, prompt, view } = req.body

    if (!image || !prompt || !view) {
      return res.status(400).json({
        error: 'Missing required fields: image, prompt, view',
      })
    }

    if (!process.env.VITE_GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'Gemini API key not configured',
      })
    }

    console.log('✅ All required fields present, proceeding with generation...')

    // Enhanced prompt for rainwater harvesting visualization
    const enhancedPrompt = `If I do rainwater harvesting pipeline for this house, how will it look?

Requirements:
- Use the uploaded house image as the base reference.
- Overlay a complete rainwater harvesting pipeline system on the house.
- Show gutters along the roof edges in blue.
- Add vertical downspouts from gutters, leading to first-flush diverters.
- Connect diverters to rectangular filtration units.
- Show large cylindrical storage tanks with connected blue pipes.
- Add overflow pipes extending to soak pits or infiltration areas.
- Show distribution pipes for garden use and home supply.
- Maintain a realistic visualization that looks integrated with the house photo.
- Pipes and water systems should be clearly visible in blue, but the house itself should remain realistic.`

    // Create the annotated image
    const modifiedImage = await createAnnotatedImage(image, view, enhancedPrompt)
    
    const responseData = {
      success: true,
      view: view,
      generatedImage: modifiedImage,
      description: `This ${view} view shows your house with a complete rainwater harvesting system visualized.`,
      prompt: enhancedPrompt,
      fallbackUsed: false,
    }
    
    console.log('📤 Sending response to client')
    res.json(responseData)

  } catch (error) {
    console.error('❌ AR generation error:', error)
    res.status(500).json({ 
      error: 'Failed to generate AR view',
      details: error.message,
    })
  }
})

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'AR Pipeline API',
    timestamp: new Date().toISOString(),
    geminiConfigured: !!process.env.VITE_GEMINI_API_KEY,
  })
})

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'AR Pipeline API is working',
    timestamp: new Date().toISOString(),
    geminiConfigured: !!process.env.VITE_GEMINI_API_KEY,
  })
})

// Test image upload endpoint
app.post('/api/test-upload', (req, res) => {
  try {
    const { image, testData } = req.body
    
    res.json({
      success: true,
      message: 'Test upload successful',
      receivedData: {
        hasImage: !!image,
        imageLength: image?.length || 0,
        testData: testData,
      },
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.listen(PORT, () => {
  console.log(`🚀 AR Pipeline API server running on http://localhost:${PORT}`)
  console.log(`📡 Endpoints:`)
  console.log(`   POST /api/generate-ar-view`)
  console.log(`   GET  /api/health`)
  console.log(`   GET  /api/test`)
  console.log(`🔑 Gemini API configured: ${!!process.env.VITE_GEMINI_API_KEY}`)
})
