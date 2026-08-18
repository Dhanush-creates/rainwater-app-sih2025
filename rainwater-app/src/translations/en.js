export default {
  // Navigation
  nav: {
    home: 'Home',
    about: 'About',
    start: 'Start',
    rooftop: 'Rooftop Calculator',
    language: 'Language'
  },
  
  // Common
  common: {
    name: 'Name',
    location: 'Location',
    submit: 'Submit',
    cancel: 'Cancel',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    required: 'Required'
  },
  
  // Form Page
  form: {
    title: 'Site Details',
    subtitle: 'Provide your property information for accurate analysis',
    name: 'Name',
    namePlaceholder: 'Enter your name',
    location: 'Location',
    locationPlaceholder: 'Start typing your city name...',
    roofArea: 'Roof Area (m²)',
    roofAreaPlaceholder: 'Enter roof area',
    dwellers: 'Number of Dwellers',
    dwellersPlaceholder: 'Enter number of people',
    openSpace: 'Available Open Space (m²)',
    openSpacePlaceholder: 'Enter available space',
    roofType: 'Roof Type',
    generateAnalysis: 'Generate AI Analysis',
    getLocation: 'Get your current location',
    locationSuccess: 'Location detected successfully',
    locationError: 'Unable to get your location. Please enter it manually.',
    locationDenied: 'Location access denied. Please enter your location manually.',
    locationUnavailable: 'Location unavailable. Please check your connection and try again.',
    locationTimeout: 'Location request timed out. Please try again.',
    locationHint: 'Start typing for suggestions or click 📍 to auto-detect',
    locationApiFallback: 'Location suggestions work even without API keys using free services.',
    locationManualEntry: 'You can still enter your location manually in the field above.'
  },
  
  // Roof Types
  roofTypes: {
    rcc: 'RCC',
    tiled: 'Tiled',
    metalSheet: 'Metal Sheet'
  },
  
  // Home Page
  home: {
    title: 'Check Your Rooftop Rainwater Harvesting Potential',
    subtitle: 'Get instant AI-powered insights on water harvesting & recharge feasibility with real-time weather data and groundwater analysis',
    getStarted: 'Start AI Assessment',
    learnMore: 'Learn More',
    threeDView: '3D View of Your House',
    threeDViewHint: '3D View: Opens in a new tab. You can return to this assessment anytime by closing the 3D view tab or using your browser\'s back button.',
    stats: {
      assessments: 'Assessments',
      accuracy: 'Accuracy',
      realtime: 'Real-time Data'
    },
    features: {
      saveWater: {
        title: 'Save Water',
        description: 'Harvest rainfall to supplement your daily needs and reduce dependency on municipal supply.'
      },
      rechargeGroundwater: {
        title: 'Recharge Groundwater',
        description: 'Help replenish local aquifers sustainably and contribute to environmental conservation.'
      },
      reduceBills: {
        title: 'Reduce Bills',
        description: 'Lower water bills significantly with stored rainwater usage and smart water management.'
      }
    }
  },
  
  // About Page
  about: {
    title: 'About Rainwater App',
    description: 'Learn more about our rainwater harvesting analysis platform'
  },
  
  // Results Page
  results: {
    title: 'Results for',
    subtitle: 'Powered by real-time data and AI',
    currentTemperature: 'Current Temperature',
    precipitation: 'Precipitation',
    soilType: 'Soil Type',
    downloadReport: 'Download Report (PDF)',
    share: 'Share',
    groundwaterAnalysis: 'Groundwater Level Analysis',
    groundwaterLevel: 'Groundwater Level',
    station: 'Station',
    agency: 'Agency',
    lastUpdated: 'Last Updated',
    aiRecommendation: 'AI-Powered Recommendation',
    upcomingRainfall: 'Upcoming Rainfall Forecast',
    loading: 'Analyzing Your Location',
    loadingSubtitle: 'Fetching weather, soil, and groundwater data...',
    error: 'Location Error',
    errorSubtitle: 'Try these popular cities:',
    goBack: 'Go Back',
    notAvailable: 'Not Available',
    loadingData: 'Loading...',
    usingFallbackData: 'Using fallback data',
    realDataAvailable: 'Real data fetched from India WRIS API!',
    mockDataNote: 'Note: Using fallback data due to API unavailability'
  },
  
  // Groundwater
  groundwater: {
    bgl: 'bgl = meters below ground level. Smaller value means higher water table.',
    replay: 'Replay',
    topsoil: 'Topsoil',
    subsoil: 'Subsoil',
    bedrock: 'Bedrock',
    waterTable: 'Water Table'
  },
  
  // Weather
  weather: {
    clearSky: 'Clear sky',
    partlyCloudy: 'Partly cloudy',
    overcast: 'Overcast',
    lightRain: 'Light rain',
    moderateRain: 'Moderate rain',
    heavyRain: 'Heavy rain',
    thunderstorm: 'Thunderstorm'
  },
  
  // Soil
  soil: {
    alluvial: 'Alluvial Soil',
    clay: 'Clay Soil',
    sandy: 'Sandy Soil',
    loamy: 'Loamy Soil',
    rocky: 'Rocky Soil'
  },
  
  // Rooftop Calculator
  rooftop: {
    title: 'Rooftop Area Calculator',
    subtitle: 'Click and draw on your rooftop to calculate the area',
    myLocation: 'My Location',
    searchPlaceholder: 'Search for your address...',
    search: 'Search',
    searching: 'Searching...',
    startDrawing: 'Start Drawing',
    drawing: 'Drawing...',
    clear: 'Clear',
    instructions: {
      title: 'How to use:',
      step1: 'Use "Search" to find your address or "My Location" for GPS',
      step2: 'Click "Start Drawing" to begin',
      step3: 'Click on your rooftop to create points',
      step4: 'Double-click to finish the polygon',
      step5: 'View the calculated area below'
    },
    areaCalculation: 'Area Calculation',
    squareMeters: 'm²',
    squareFeet: 'ft²',
    rainwaterPotential: 'Rainwater Collection Potential',
    annualRainfall: 'Annual rainfall: ~1000mm',
    potentialCollection: 'Potential collection:',
    litersPerYear: 'liters/year',
    tankRecommendation: 'Tank Size Recommendation',
    threeMonthsStorage: 'For 3 months storage:',
    liters: 'liters',
    tips: {
      title: 'Tips for accurate measurement:',
      tip1: 'Use satellite view for better rooftop visibility',
      tip2: 'Draw along the edges of your rooftop',
      tip3: 'Include all roof sections if you have multiple levels',
      tip4: 'Exclude areas covered by solar panels or other structures'
    },
    drawPrompt: 'Draw on your rooftop to see the area calculation',
    mapLoadingError: 'Map Loading Error',
    mapErrorDescription: 'Failed to load Google Maps. Please check your API key.',
    apiRequirements: 'Please make sure you have a valid Google Maps API key with the following APIs enabled:',
    mapsApi: 'Maps JavaScript API',
    drawingLibrary: 'Drawing Library',
    geometryLibrary: 'Geometry Library',
    loadingMap: 'Loading Google Maps...'
  },
  
  // AR Pipeline
  arPipeline: {
    title: 'AR Rainwater Pipeline',
    subtitle: 'Upload images of your house and see how a complete artificial recharge rainwater harvesting system would look from all angles',
    uploadImages: 'Upload House Images',
    clickToUpload: 'Click to upload images',
    uploading: 'Uploading...',
    uploadHint: 'Upload single or multiple images of your house (JPG, PNG, max 10MB each)',
    uploadedImages: 'Uploaded Images:',
    generateViews: 'Generate AR Rainwater Pipeline Views',
    generating: 'Generating AR Views...',
    progress: 'Generating {current} of 4 views...',
    generatedViews: 'Generated AR Views',
    frontView: 'Front View',
    backView: 'Back View',
    leftView: 'Left View',
    rightView: 'Right View',
    download: 'Download',
    viewDescription: 'This {view} view shows your house with a complete rainwater harvesting system installed.',
    errorUpload: 'Please upload only image files',
    errorSize: 'Image size should be less than 10MB',
    errorNoImages: 'Please upload at least one image of your house',
    errorGeneration: 'Failed to generate AR views. Please try again.',
    systemComponents: {
      title: 'System Components',
      collection: 'Rainwater Collection System',
      storage: 'Storage System',
      distribution: 'Distribution System',
      recharge: 'Groundwater Recharge'
    }
  },
  
  // Footer
  footer: {
    copyright: '© Rainwater App Prototype'
  }
}
