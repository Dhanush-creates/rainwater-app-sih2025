const express = require('express')
const multer = require('multer')
const { GoogleGenerativeAI } = require('@google/generative-ai')
const router = express.Router()

// Configure multer for image uploads
const storage = multer.memoryStorage()
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
})

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

router.post('/generate-ar-view', async (req, res) => {
  try {
    const { image, prompt, view } = req.body

    if (!image || !prompt || !view) {
      return res.status(400).json({ 
        error: 'Missing required fields: image, prompt, view' 
      })
    }

    // Get the generative model
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
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
        data: image.split(',')[1], // Remove data:image/jpeg;base64, prefix
        mimeType: image.split(',')[0].split(':')[1].split(';')[0] // Extract mime type
      }
    }

    // Enhanced prompt for better results
    const enhancedPrompt = `${prompt}

    Technical Requirements:
    - Generate a photorealistic image that looks like a professional architectural visualization
    - Ensure all rainwater harvesting components are properly integrated and realistic
    - Maintain the original house structure and architectural style
    - Show proper proportions and realistic materials
    - Include appropriate lighting and shadows
    - Make the system look professionally installed and maintained

    Focus on the ${view} view specifically, showing:
    - How the rainwater collection system integrates with the roof
    - The positioning of storage tanks relative to the house
    - The layout of distribution pipes and irrigation systems
    - Groundwater recharge features like percolation pits or rain gardens
    - Overall aesthetic integration with the existing property

    The final image should be suitable for presentation to homeowners and contractors.`

    // Generate the image
    const result = await model.generateContent([enhancedPrompt, imageData])
    const response = await result.response

    // Extract the generated image (if Gemini supports image generation)
    // Note: Current Gemini models may not support direct image generation
    // This is a placeholder for when image generation becomes available
    const generatedImage = response.text() // This would be the image data in a real implementation

    // For now, we'll return a mock response with instructions
    // In a real implementation, you would integrate with an image generation service
    res.json({
      success: true,
      view: view,
      generatedImage: image, // Placeholder - would be the actual generated image
      description: `This ${view} view shows your house with a complete rainwater harvesting system. The system includes gutters, storage tanks, filtration, and groundwater recharge features professionally integrated with your existing architecture.`,
      prompt: enhancedPrompt
    })

  } catch (error) {
    console.error('AR generation error:', error)
    res.status(500).json({ 
      error: 'Failed to generate AR view',
      details: error.message 
    })
  }
})

// Alternative endpoint using external image generation service
router.post('/generate-ar-view-external', async (req, res) => {
  try {
    const { image, prompt, view } = req.body

    // This would integrate with services like:
    // - DALL-E 3
    // - Midjourney API
    // - Stable Diffusion
    // - Custom trained models

    // For demonstration, we'll use a placeholder service
    const response = await fetch('https://api.example-image-service.com/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.IMAGE_GENERATION_API_KEY}`
      },
      body: JSON.stringify({
        prompt: prompt,
        input_image: image,
        style: 'photorealistic',
        quality: 'high'
      })
    })

    if (!response.ok) {
      throw new Error('Image generation service failed')
    }

    const result = await response.json()

    res.json({
      success: true,
      view: view,
      generatedImage: result.image_url,
      description: result.description || `Generated ${view} view with rainwater harvesting system`
    })

  } catch (error) {
    console.error('External AR generation error:', error)
    res.status(500).json({ 
      error: 'Failed to generate AR view using external service',
      details: error.message 
    })
  }
})

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'AR Pipeline API',
    timestamp: new Date().toISOString()
  })
})

module.exports = router
