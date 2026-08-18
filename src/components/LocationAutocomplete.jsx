import { useState, useEffect, useRef } from 'react';
import { ACCUWEATHER_API_KEY } from '../utils/api';

const LocationAutocomplete = ({ value, onChange, placeholder, className }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Debounce search to avoid too many API calls
  useEffect(() => {
    if (!value || value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      await searchLocations(value);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [value]);

  const searchLocations = async (query) => {
    setIsLoading(true);
    let suggestions = [];
    
    try {
      // Method 1: Try AccuWeather API (if key is available and valid)
      if (ACCUWEATHER_API_KEY) {
        try {
          const base = 'https://dataservice.accuweather.com';
          const searchUrl = `${base}/locations/v1/cities/autocomplete?apikey=${encodeURIComponent(ACCUWEATHER_API_KEY)}&q=${encodeURIComponent(query)}`;
          
          const response = await fetch(searchUrl);
          if (response.ok) {
            const data = await response.json();
            suggestions = data || [];
          } else {
            console.log('AccuWeather API failed, trying fallback...');
          }
        } catch (apiError) {
          console.log('AccuWeather API error, trying fallback...');
        }
      }
      
      // Method 2: Try OpenStreetMap Nominatim (free, no API key required)
      if (suggestions.length === 0) {
        try {
          const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`;
          const response = await fetch(nominatimUrl, {
            headers: {
              'User-Agent': 'RainwaterApp/1.0'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            // Transform Nominatim data to match our expected format
            suggestions = data.map(item => ({
              Key: item.place_id,
              LocalizedName: item.display_name.split(',')[0], // First part of display name
              Country: {
                LocalizedName: item.address?.country || ''
              },
              AdministrativeArea: {
                LocalizedName: item.address?.state || item.address?.county || ''
              }
            }));
          }
        } catch (nominatimError) {
          console.log('Nominatim API failed');
        }
      }
      
      // Method 3: Use predefined popular cities as fallback
      if (suggestions.length === 0) {
        const popularCities = [
          { name: 'Mumbai', country: 'India', state: 'Maharashtra' },
          { name: 'Delhi', country: 'India', state: 'Delhi' },
          { name: 'Bangalore', country: 'India', state: 'Karnataka' },
          { name: 'Chennai', country: 'India', state: 'Tamil Nadu' },
          { name: 'Kolkata', country: 'India', state: 'West Bengal' },
          { name: 'Hyderabad', country: 'India', state: 'Telangana' },
          { name: 'Pune', country: 'India', state: 'Maharashtra' },
          { name: 'Ahmedabad', country: 'India', state: 'Gujarat' },
          { name: 'New York', country: 'United States', state: 'New York' },
          { name: 'London', country: 'United Kingdom', state: 'England' },
          { name: 'Tokyo', country: 'Japan', state: 'Tokyo' },
          { name: 'Sydney', country: 'Australia', state: 'New South Wales' }
        ];
        
        const filteredCities = popularCities.filter(city => 
          city.name.toLowerCase().includes(query.toLowerCase()) ||
          city.state.toLowerCase().includes(query.toLowerCase()) ||
          city.country.toLowerCase().includes(query.toLowerCase())
        );
        
        suggestions = filteredCities.map(city => ({
          Key: city.name.toLowerCase().replace(/\s+/g, '_'),
          LocalizedName: city.name,
          Country: {
            LocalizedName: city.country
          },
          AdministrativeArea: {
            LocalizedName: city.state
          }
        }));
      }
      
      setSuggestions(suggestions);
      setShowSuggestions(true);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Error fetching location suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);
    setShowSuggestions(true);
  };

  const handleSuggestionClick = (suggestion) => {
    const locationText = `${suggestion.LocalizedName}, ${suggestion.Country?.LocalizedName || ''}`;
    onChange(locationText);
    setShowSuggestions(false);
    setSuggestions([]);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleBlur = (e) => {
    // Delay hiding suggestions to allow clicks on suggestions
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }, 200);
  };

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      
      {isLoading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div 
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.Key}-${index}`}
              onClick={() => handleSuggestionClick(suggestion)}
              className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${
                index === selectedIndex 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">
                    {suggestion.LocalizedName}
                  </div>
                  <div className="text-sm text-gray-500">
                    {suggestion.AdministrativeArea?.LocalizedName && 
                      `${suggestion.AdministrativeArea.LocalizedName}, `}
                    {suggestion.Country?.LocalizedName}
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  📍
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocationAutocomplete;
