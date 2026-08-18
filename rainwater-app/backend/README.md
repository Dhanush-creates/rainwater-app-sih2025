# Soil Analysis Web Application

A beautiful web application that analyzes soil types and properties for any location worldwide. Simply enter a location name (like "Chennai", "Mumbai", "New York") and get comprehensive soil information including soil type, properties, and summary.

## Features

- 🌍 **Location-based Analysis**: Enter any location name and automatically get coordinates
- 🌱 **Comprehensive Soil Data**: Get soil type, properties, and detailed summary
- 📊 **Visual Probabilities**: See soil type probabilities with interactive charts
- 🎨 **Beautiful UI**: Modern, responsive design with gradient backgrounds
- 📱 **Mobile Friendly**: Works perfectly on all devices
- ⚡ **Real-time Results**: Fast API calls with loading indicators

## Installation

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Run the Application**:
   ```bash
   python app.py
   ```

3. **Open in Browser**:
   Navigate to `http://localhost:5000`

## How to Use

1. Enter a location name in the search box (e.g., "Chennai", "Mumbai", "New York")
2. Click "Analyze Soil" button
3. View the results including:
   - Location coordinates
   - Most probable soil type
   - Soil type probabilities
   - Soil properties
   - Detailed soil summary

## API Endpoints

- `GET /` - Main application page
- `POST /get_soil_info` - Get soil information for a location

## Technologies Used

- **Backend**: Flask (Python)
- **Frontend**: HTML5, CSS3, JavaScript
- **APIs**: 
  - OpenStreetMap Nominatim (for geocoding)
  - OpenEpi Soil API (for soil data)
- **Styling**: Custom CSS with gradients and animations

## Example Locations to Try

- Chennai, India
- Mumbai, India
- New York, USA
- London, UK
- Tokyo, Japan
- Sydney, Australia
- Paris, France
- Berlin, Germany

## Error Handling

The application includes comprehensive error handling for:
- Invalid location names
- Network connectivity issues
- API response errors
- Invalid coordinates

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Contributing

Feel free to submit issues and enhancement requests!

## License

This project is open source and available under the MIT License.

