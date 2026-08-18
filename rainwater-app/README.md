# Rainwater Harvesting App

A comprehensive React application for analyzing rainwater harvesting potential with real-time weather data, groundwater analysis, and AI-powered recommendations.

## Features

### 🌧️ AI-Powered Rainwater Analysis
- Real-time weather data integration
- Groundwater level analysis
- Soil type detection
- AI-powered recommendations for rainwater harvesting systems

### 🏠 Rooftop Area Calculator
- **NEW!** Interactive Google Maps integration
- Click and draw on your rooftop to calculate area
- Real-time area calculation in square meters and square feet
- Rainwater collection potential estimation
- Tank size recommendations
- Multi-language support (English, Hindi, Tamil)

### 📊 Data Visualization
- Monthly rainfall charts
- Groundwater level animations
- Rainfall forecast animations
- Interactive data exploration

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Copy `env.example` to `.env` and configure your API keys:

```bash
cp env.example .env
```

Required API keys:
- **WeatherAPI.com**: For rainfall data
- **Google Maps API**: For rooftop area calculator
- **Google Gemini AI**: For AI recommendations

### 3. Google Maps API Setup (for Rooftop Calculator)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - Maps JavaScript API
   - Drawing Library
   - Geometry Library
4. Create credentials (API Key)
5. Add the API key to your `.env` file:
   ```
   VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
   ```

### 4. Run the Application
```bash
npm run dev
```

## Rooftop Area Calculator Usage

1. Navigate to the "Rooftop Calculator" from the main menu
2. Click "My Location" to find your house on the map
3. Click "Start Drawing" to begin drawing on your rooftop
4. Click on your rooftop edges to create points
5. Double-click to finish the polygon
6. View the calculated area and rainwater collection potential

### Tips for Accurate Measurement
- Use satellite view for better rooftop visibility
- Draw along the edges of your rooftop
- Include all roof sections if you have multiple levels
- Exclude areas covered by solar panels or other structures

## API Requirements

### WeatherAPI.com
- Get your free API key at: https://www.weatherapi.com/
- Used for real-time weather and rainfall data

### Google Maps API
- Get your API key at: https://console.cloud.google.com/
- Required for rooftop area calculation feature
- Must enable: Maps JavaScript API, Drawing Library, Geometry Library

### Google Gemini AI
- Get your API key at: https://ai.google.dev/
- Used for AI-powered recommendations

## Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run proxy` - Start proxy server for API calls
- `npm run dev:full` - Start both proxy and dev server

### Project Structure
```
src/
├── components/          # Reusable components
│   ├── RooftopAreaCalculator.jsx  # NEW: Google Maps integration
│   └── ...
├── pages/              # Page components
│   ├── RooftopCalculator.jsx       # NEW: Rooftop calculator page
│   └── ...
├── translations/        # Multi-language support
│   ├── en.js          # English translations
│   ├── hi.js          # Hindi translations
│   └── ta.js          # Tamil translations
└── utils/             # Utility functions
```

## Multi-Language Support

The application supports three languages:
- English (en)
- Hindi (hi) 
- Tamil (ta)

All text content is translated including the new rooftop calculator feature.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
