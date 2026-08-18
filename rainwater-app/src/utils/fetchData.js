import { ACCUWEATHER_API_KEY } from './api';

/**
 * Fetches weather data for a given location using multiple fallback methods.
 * @param {string} location - The location to fetch weather data for.
 * @returns {Promise<object>} - A promise that resolves to the weather data.
 */
export const fetchWeatherData = async (location) => {
  // Try AccuWeather API first if key is available
  if (ACCUWEATHER_API_KEY) {
    try {
      return await fetchWeatherDataFromAccuWeather(location);
    } catch (error) {
      console.log('AccuWeather API failed, trying fallback methods...', error.message);
    }
  }
  
  // Fallback to Open-Meteo (free, no API key required)
  try {
    return await fetchWeatherDataFromOpenMeteo(location);
  } catch (error) {
    console.log('Open-Meteo API failed, using mock data...', error.message);
  }
  
  // Final fallback: return mock data
  return getMockWeatherData(location);
};

/**
 * Fetches weather data from AccuWeather API
 */
const fetchWeatherDataFromAccuWeather = async (location) => {
  const base = 'https://dataservice.accuweather.com';
  let searchUrl;
  
  // Check if location is coordinates (lat, lon format)
  const coordMatch = location.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
  if (coordMatch) {
    const [, lat, lon] = coordMatch;
    // Use geoposition search for coordinates
    searchUrl = `${base}/locations/v1/cities/geoposition/search?apikey=${encodeURIComponent(ACCUWEATHER_API_KEY)}&q=${encodeURIComponent(`${lat},${lon}`)}`;
  } else {
    // Use city search for text location
    searchUrl = `${base}/locations/v1/cities/search?apikey=${encodeURIComponent(ACCUWEATHER_API_KEY)}&q=${encodeURIComponent(location)}`;
  }
  
  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) {
    const text = await searchRes.text().catch(() => '');
    throw new Error(`Failed to resolve location: ${searchRes.status} ${searchRes.statusText} ${text}`);
  }
  const search = await searchRes.json();
  let loc = null;
  
  if (coordMatch) {
    // For coordinates, we expect a single object, not an array
    if (search && search.Key) {
      loc = search;
    } else {
      throw new Error(`Location not found for coordinates ${location}. Please try a different location.`);
    }
  } else {
    // For text locations, we expect an array
    if (!Array.isArray(search) || search.length === 0) {
      // Try a more flexible search with different variations
      const fallbackSearches = [
        location.split(',')[0], // Just the city name
        location.split(' ')[0], // First word
        location.replace(/[^a-zA-Z\s]/g, '').trim() // Remove special characters
      ];
      
      for (const fallback of fallbackSearches) {
        if (fallback && fallback.length > 2) {
          try {
            const fallbackUrl = `${base}/locations/v1/cities/search?apikey=${encodeURIComponent(ACCUWEATHER_API_KEY)}&q=${encodeURIComponent(fallback)}`;
            const fallbackRes = await fetch(fallbackUrl);
            if (fallbackRes.ok) {
              const fallbackData = await fallbackRes.json();
              if (Array.isArray(fallbackData) && fallbackData.length > 0) {
                loc = fallbackData[0];
                break;
              }
            }
          } catch (e) {
            continue;
          }
        }
      }
      
      if (!loc) {
        throw new Error(`Location "${location}" not found. Please try a different city name (e.g., "Mumbai", "Delhi", "New York").`);
      }
    } else {
      loc = search[0];
    }
  }
  const locationKey = loc.Key;

  // 2) Current conditions (with details for precipitation summary)
  const currentUrl = `${base}/currentconditions/v1/${encodeURIComponent(locationKey)}?apikey=${encodeURIComponent(ACCUWEATHER_API_KEY)}&details=true`;
  const currentRes = await fetch(currentUrl);
  if (!currentRes.ok) {
    const text = await currentRes.text().catch(() => '');
    throw new Error(`Failed to fetch current conditions: ${currentRes.status} ${currentRes.statusText} ${text}`);
  }
  const currentArr = await currentRes.json();
  const current = Array.isArray(currentArr) && currentArr[0] ? currentArr[0] : null;
  if (!current) throw new Error('Unexpected AccuWeather current conditions response');

  // 3) 24-hour historical conditions to compute recent precipitation totals
  const historyUrl = `${base}/currentconditions/v1/${encodeURIComponent(locationKey)}/historical/24?apikey=${encodeURIComponent(ACCUWEATHER_API_KEY)}`;
  let historyArr = [];
  try {
    const historyRes = await fetch(historyUrl);
    if (historyRes.ok) {
      historyArr = await historyRes.json();
    }
  } catch (_) {
    // ignore; we'll fall back to current conditions/forecast
  }

  // 4) 5-day daily forecast (metric=true for Celsius and mm)
  const forecastUrl = `${base}/forecasts/v1/daily/5day/${encodeURIComponent(locationKey)}?apikey=${encodeURIComponent(ACCUWEATHER_API_KEY)}&metric=true`;
  const forecastRes = await fetch(forecastUrl);
  if (!forecastRes.ok) {
    const text = await forecastRes.text().catch(() => '');
    throw new Error(`Failed to fetch forecast: ${forecastRes.status} ${forecastRes.statusText} ${text}`);
  }
  const forecastJson = await forecastRes.json();
  const daily = Array.isArray(forecastJson?.DailyForecasts) ? forecastJson.DailyForecasts : [];

  // Shape data to match existing consumers in ResultsPage
  // Prefer 24h history totals, then current summaries
  let currentPrecip = 0;
  let precipSource = 'current';
  let precipNote = '';
  
  if (Array.isArray(historyArr) && historyArr.length > 0) {
    const last = historyArr[historyArr.length - 1];
    const total24 = last?.PrecipitationSummary?.Past24Hours?.Metric?.Value;
    const past3 = last?.PrecipitationSummary?.Past3Hours?.Metric?.Value;
    const past1 = last?.PrecipitationSummary?.PastHour?.Metric?.Value;
    currentPrecip = total24 ?? past3 ?? past1 ?? 0;
    if (currentPrecip > 0) {
      precipSource = 'historical';
      precipNote = 'Last 24h';
    }
  } else {
    currentPrecip =
      current?.PrecipitationSummary?.PastHour?.Metric?.Value ??
      current?.PrecipitationSummary?.Past3Hours?.Metric?.Value ??
      current?.PrecipitationSummary?.Past24Hours?.Metric?.Value ?? 0;
    if (currentPrecip > 0) {
      precipSource = 'current';
      precipNote = 'Current';
    }
  }

  // If still zero and we have forecast for today, use it as indicative precip
  const todayIso = new Date().toISOString().slice(0, 10);
  const forecastDaily = Array.isArray(forecastJson?.DailyForecasts) ? forecastJson.DailyForecasts : [];
  const today = forecastDaily.find(d => (d?.Date ? new Date(d.Date).toISOString().slice(0,10) : '') === todayIso);
  if ((currentPrecip == null || currentPrecip === 0) && today) {
    // AccuWeather doesn't provide exact rainfall amounts, only indicators
    const hasDayPrecip = today?.Day?.HasPrecipitation;
    const hasNightPrecip = today?.Night?.HasPrecipitation;
    const dayIntensity = today?.Day?.PrecipitationIntensity;
    const nightIntensity = today?.Night?.PrecipitationIntensity;
    
    if (hasDayPrecip || hasNightPrecip) {
      // Estimate based on intensity
      let estimatedRain = 0;
      if (dayIntensity === 'Heavy') estimatedRain += 15;
      else if (dayIntensity === 'Moderate') estimatedRain += 8;
      else if (dayIntensity === 'Light') estimatedRain += 3;
      
      if (nightIntensity === 'Heavy') estimatedRain += 15;
      else if (nightIntensity === 'Moderate') estimatedRain += 8;
      else if (nightIntensity === 'Light') estimatedRain += 3;
      
      if (estimatedRain > 0) {
        currentPrecip = estimatedRain;
        precipSource = 'forecast';
        precipNote = 'Today forecast (estimated)';
      }
    }
  }
  
  // If still zero, try to get any precipitation from current conditions
  if ((currentPrecip == null || currentPrecip === 0) && current) {
    // Check for any precipitation-related fields
    const precipFields = [
      current.Precipitation?.Metric?.Value,
      current.PrecipitationSummary?.PastHour?.Metric?.Value,
      current.PrecipitationSummary?.Past3Hours?.Metric?.Value,
      current.PrecipitationSummary?.Past24Hours?.Metric?.Value
    ];
    for (const field of precipFields) {
      if (field && field > 0) {
        currentPrecip = field;
        precipSource = 'current';
        precipNote = 'Current';
        break;
      }
    }
  }

  // If still zero, check if there's any precipitation forecast in the next few days
  if (currentPrecip === 0) {
    const nextFewDays = forecastDaily.slice(0, 3); // Check next 3 days
    for (const day of nextFewDays) {
      const dayRain = day?.Day?.Rain?.Value || 0;
      const nightRain = day?.Night?.Rain?.Value || 0;
      if (dayRain > 0 || nightRain > 0) {
        currentPrecip = dayRain + nightRain;
        precipSource = 'forecast';
        const dayDate = day?.Date ? new Date(day.Date).toLocaleDateString() : 'upcoming';
        precipNote = `Forecast (${dayDate})`;
        break;
      }
    }
  }

  // Final fallback using Open-Meteo (coordinates only) to get last 24h precipitation
  if (currentPrecip === 0 && loc?.GeoPosition?.Latitude != null && loc?.GeoPosition?.Longitude != null) {
    try {
      const latNum = Number(loc.GeoPosition.Latitude);
      const lonNum = Number(loc.GeoPosition.Longitude);
      if (!Number.isNaN(latNum) && !Number.isNaN(lonNum)) {
        const params = new URLSearchParams({
          latitude: latNum.toString(),
          longitude: lonNum.toString(),
          hourly: 'precipitation',
          past_days: '1',
          forecast_days: '1',
          timezone: 'auto'
        });
        const omUrl = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
        const omRes = await fetch(omUrl);
        if (omRes.ok) {
          const om = await omRes.json();
          const arr = om?.hourly?.precipitation || [];
          const times = om?.hourly?.time || [];
          if (Array.isArray(arr) && arr.length > 0) {
            // Sum last 24 hours if we have timestamps; otherwise sum all returned
            let values = arr;
            if (Array.isArray(times) && times.length === arr.length) {
              const cutoff = Date.now() - 24 * 60 * 60 * 1000;
              const pairs = times.map((t, i) => ({ t: Date.parse(t), v: Number(arr[i]) || 0 }));
              values = pairs.filter(p => isFinite(p.t) && p.t >= cutoff).map(p => p.v);
              if (values.length === 0) values = arr.map(v => Number(v) || 0);
            } else {
              values = arr.map(v => Number(v) || 0);
            }
            const sum = values.reduce((a, b) => a + b, 0);
            if (sum > 0) {
              currentPrecip = Math.round(sum * 10) / 10; // keep one decimal
              precipSource = 'open-meteo';
              precipNote = 'Last 24h (Open‑Meteo)';
            }
          }
        }
      }
    } catch (_) {
      // ignore fallback failure
    }
  }

  const shaped = {
    current: {
      temp_c: current?.Temperature?.Metric?.Value ?? null,
      precip_mm: currentPrecip,
      precip_source: precipSource,
      precip_note: precipNote,
      condition: { text: current?.WeatherText ?? '' },
    },
    forecast: daily.map((d) => {
      // Estimate precipitation based on intensity indicators
      let estimatedRain = 0;
      const dayIntensity = d?.Day?.PrecipitationIntensity;
      const nightIntensity = d?.Night?.PrecipitationIntensity;
      
      if (d?.Day?.HasPrecipitation && dayIntensity) {
        if (dayIntensity === 'Heavy') estimatedRain += 15;
        else if (dayIntensity === 'Moderate') estimatedRain += 8;
        else if (dayIntensity === 'Light') estimatedRain += 3;
      }
      
      if (d?.Night?.HasPrecipitation && nightIntensity) {
        if (nightIntensity === 'Heavy') estimatedRain += 15;
        else if (nightIntensity === 'Moderate') estimatedRain += 8;
        else if (nightIntensity === 'Light') estimatedRain += 3;
      }
      
      return {
        date: d?.Date ? new Date(d.Date).toISOString().slice(0, 10) : '',
        day: {
          totalprecip_mm: estimatedRain,
          condition: { text: d?.Day?.IconPhrase || '' },
          hasPrecipitation: d?.Day?.HasPrecipitation || d?.Night?.HasPrecipitation,
          precipitationType: d?.Day?.PrecipitationType || d?.Night?.PrecipitationType,
          precipitationIntensity: dayIntensity || nightIntensity,
        },
      };
    }),
    location: {
      name: loc?.EnglishName || loc?.LocalizedName || location,
      region: loc?.AdministrativeArea?.EnglishName || '',
      country: loc?.Country?.EnglishName || '',
      lat: loc?.GeoPosition?.Latitude,
      lon: loc?.GeoPosition?.Longitude,
    },
  };

  return shaped;
};

/**
 * Fetches weather data from Open-Meteo API (free, no API key required)
 */
const fetchWeatherDataFromOpenMeteo = async (location) => {
  // Parse coordinates or try to geocode location
  let lat, lon;
  
  const coordMatch = location.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
  if (coordMatch) {
    [, lat, lon] = coordMatch;
  } else {
    // Try to geocode using Nominatim
    const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`;
    const geocodeRes = await fetch(geocodeUrl, {
      headers: { 'User-Agent': 'RainwaterApp/1.0' }
    });
    
    if (!geocodeRes.ok) {
      throw new Error('Failed to geocode location');
    }
    
    const geocodeData = await geocodeRes.json();
    if (!geocodeData || geocodeData.length === 0) {
      throw new Error('Location not found');
    }
    
    lat = geocodeData[0].lat;
    lon = geocodeData[0].lon;
  }
  
  // Fetch current weather and forecast from Open-Meteo
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: 'temperature_2m,precipitation,weather_code',
    hourly: 'precipitation',
    daily: 'precipitation_sum,weather_code',
    timezone: 'auto',
    forecast_days: 5
  });
  
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const weatherRes = await fetch(weatherUrl);
  
  if (!weatherRes.ok) {
    throw new Error(`Open-Meteo API failed: ${weatherRes.status}`);
  }
  
  const weatherData = await weatherRes.json();
  
  // Calculate precipitation from hourly data (last 24 hours)
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const hourlyPrecip = weatherData.hourly?.precipitation || [];
  const hourlyTime = weatherData.hourly?.time || [];
  
  let precip24h = 0;
  if (hourlyPrecip.length > 0 && hourlyTime.length > 0) {
    const cutoffTime = yesterday.toISOString().slice(0, 13) + ':00'; // Hour precision
    const cutoffIndex = hourlyTime.findIndex(time => time >= cutoffTime);
    if (cutoffIndex >= 0) {
      precip24h = hourlyPrecip.slice(cutoffIndex).reduce((sum, val) => sum + (val || 0), 0);
    }
  }
  
  // Get location name from geocoding
  let locationName = location;
  if (!coordMatch) {
    try {
      const reverseGeocodeUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`;
      const reverseRes = await fetch(reverseGeocodeUrl, {
        headers: { 'User-Agent': 'RainwaterApp/1.0' }
      });
      if (reverseRes.ok) {
        const reverseData = await reverseRes.json();
        const address = reverseData.address;
        if (address) {
          const city = address.city || address.town || address.village || address.hamlet;
          const state = address.state;
          const country = address.country;
          locationName = [city, state, country].filter(Boolean).join(', ');
        }
      }
    } catch (e) {
      // Ignore reverse geocoding errors
    }
  }
  
  return {
    current: {
      temp_c: Math.round(weatherData.current?.temperature_2m || 0),
      precip_mm: Math.round(precip24h * 10) / 10,
      precip_source: 'open-meteo',
      precip_note: 'Last 24h',
      condition: { 
        text: getWeatherDescription(weatherData.current?.weather_code) 
      },
    },
    forecast: (weatherData.daily?.precipitation_sum || []).slice(0, 5).map((precip, index) => ({
      date: new Date(Date.now() + index * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      day: {
        totalprecip_mm: Math.round(precip * 10) / 10,
        condition: { 
          text: getWeatherDescription(weatherData.daily?.weather_code?.[index]) 
        },
        hasPrecipitation: precip > 0,
        precipitationType: precip > 0 ? 'Rain' : 'None',
        precipitationIntensity: precip > 10 ? 'Heavy' : precip > 5 ? 'Moderate' : precip > 0 ? 'Light' : 'None',
      },
    })),
    location: {
      name: locationName,
      region: '',
      country: '',
      lat: parseFloat(lat),
      lon: parseFloat(lon),
    },
  };
};

/**
 * Returns mock weather data as final fallback
 */
const getMockWeatherData = (location) => {
  // Parse coordinates if available
  let lat = 12.9716, lon = 77.5946; // Default to Bangalore
  const coordMatch = location.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
  if (coordMatch) {
    [, lat, lon] = coordMatch;
  }
  
  return {
    current: {
      temp_c: 25,
      precip_mm: 0,
      precip_source: 'mock',
      precip_note: 'Sample data',
      condition: { text: 'Partly Cloudy' },
    },
    forecast: Array.from({ length: 5 }, (_, i) => ({
      date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      day: {
        totalprecip_mm: Math.random() * 10,
        condition: { text: 'Partly Cloudy' },
        hasPrecipitation: Math.random() > 0.7,
        precipitationType: 'Rain',
        precipitationIntensity: 'Light',
      },
    })),
    location: {
      name: location,
      region: '',
      country: '',
      lat: parseFloat(lat),
      lon: parseFloat(lon),
    },
  };
};

/**
 * Converts Open-Meteo weather codes to descriptions
 */
const getWeatherDescription = (code) => {
  const weatherCodes = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
  };
  return weatherCodes[code] || 'Unknown';
};

/**
 * Fetches groundwater data from India WRIS API using user-provided parameters.
 * @param {object} params - The groundwater data parameters from user form.
 * @returns {Promise<object>} - A promise that resolves to the groundwater data.
 */
// Test function to check API connectivity
export const testWRISAPI = async () => {
  const testParams = {
    stateName: 'tamil nadu',
    districtName: 'chennai',
    agencyName: 'cgwb',
    startdate: '2020-09-13',
    enddate: '2025-09-13',
    page: 0,
    size: 500
  };
  
  console.log('🧪 Testing WRIS API with parameters:', testParams);
  console.log('⚠️ Note: The India WRIS API has known CORS issues that prevent direct browser access.');
  console.log('💡 For production use, you would need a backend proxy server to access this API.');
  
  // First, test if the local proxy server is running
  try {
    console.log('🔍 Testing local proxy server connectivity...');
    const proxyTest = await fetch('http://localhost:3001/health', {
      method: 'GET',
      mode: 'cors'
    });
    if (proxyTest.ok) {
      console.log('✅ Local proxy server is running!');
    } else {
      console.log('❌ Local proxy server is not responding properly');
    }
  } catch (error) {
    console.log('❌ Local proxy server is not running. Start it with: npm run proxy');
  }
  
  // First, let's try a simple connectivity test
  try {
    console.log('🔍 Testing basic connectivity to indiawris.gov.in...');
    const connectivityTest = await fetch('https://indiawris.gov.in', {
      method: 'HEAD',
      mode: 'no-cors'
    });
    console.log('✅ Basic connectivity test result:', connectivityTest);
  } catch (error) {
    console.log('❌ Basic connectivity test failed:', error);
  }
  
  // Try to access the API catalog page
  try {
    console.log('🔍 Testing API catalog access...');
    const catalogTest = await fetch('https://indiawris.gov.in/wris/#/apiCatalog', {
      method: 'GET',
      mode: 'no-cors'
    });
    console.log('✅ API catalog test result:', catalogTest);
  } catch (error) {
    console.log('❌ API catalog test failed:', error);
  }
  
  return await fetchGroundwaterData(testParams);
};

export const fetchGroundwaterData = async (params) => {
  try {
    if (!params) {
      throw new Error('Groundwater parameters not provided');
    }

    const { stateName, districtName, agencyName, startdate, enddate, page, size } = params;
    
    // Format dates properly (YYYY-MM-DD format)
    const formatDate = (dateStr) => {
      if (!dateStr) return '2020-01-01'; // Default fallback
      // Convert various date formats to YYYY-MM-DD
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '2020-01-01'; // Fallback for invalid dates
      return date.toISOString().split('T')[0];
    };
    
    const formattedStartDate = formatDate(startdate);
    const formattedEndDate = formatDate(enddate);
    
    console.log('📅 Original dates - Start:', startdate, 'End:', enddate);
    console.log('📅 Formatted dates - Start:', formattedStartDate, 'End:', formattedEndDate);
    
    // The correct India WRIS API endpoint and method
    const baseUrl = 'https://indiawris.gov.in/Dataset/Ground Water Level';
    
    // Construct the correct URL with parameters
    const queryParams = new URLSearchParams({
      stateName: stateName,
      districtName: districtName,
      agencyName: agencyName,
      startdate: formattedStartDate,
      enddate: formattedEndDate,
      download: 'false',
      page: page.toString(),
      size: size.toString()
    });
    
    const targetUrl = `${baseUrl}?${queryParams.toString()}`;
    
    // Try different approaches including proxy services
    const possibleEndpoints = [
      // Try local proxy server first (if running) - use the /api endpoint
      `http://localhost:3001/api?${queryParams.toString()}`,
      // Try local proxy server with /proxy endpoint
      `http://localhost:3001/proxy/Dataset/Ground Water Level?${queryParams.toString()}`,
      // Try with different CORS proxy services
      `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
      `https://cors-anywhere.herokuapp.com/${targetUrl}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
      // Direct endpoint (will likely fail due to CORS)
      targetUrl
    ];
    
    // Use the correct parameter format as specified in the API documentation
    console.log('📋 Using correct API format with POST method');
    console.log('🎯 Target URL:', targetUrl);
    
    let response;
    let data;
    let lastError;
    let successfulEndpoint = null;
    let successfulParams = null;
    
    // Try different endpoints with POST method
    for (const endpoint of possibleEndpoints) {
      try {
        console.log('🔄 Trying endpoint:', endpoint);
        console.log('📋 Target URL:', targetUrl);
        console.log('🔗 Full proxy URL:', endpoint);
        
        // Use POST method as specified in the curl command
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          mode: 'cors',
          body: '' // Empty body as shown in curl command
        });
        
        console.log('📊 Response status:', response.status, response.statusText);
        
        if (response.ok) {
          data = await response.json();
          console.log('✅ WRIS API response:', data);
          console.log('📊 Response structure analysis:');
          console.log('- Has content array:', data && data.content && Array.isArray(data.content));
          console.log('- Content length:', data && data.content ? data.content.length : 'N/A');
          console.log('- Response keys:', data ? Object.keys(data) : 'N/A');
          if (data && data.content && data.content.length > 0) {
            console.log('- First content item keys:', Object.keys(data.content[0]));
          }
          successfulEndpoint = endpoint;
          break; // Success, exit the loop
        } else {
          lastError = `HTTP ${response.status}: ${response.statusText}`;
          console.log('❌ Endpoint failed:', lastError);
        }
      } catch (error) {
        lastError = error.message;
        console.log('💥 Endpoint error:', error.message);
        continue; // Try next endpoint
      }
    }
    
    if (!response || !response.ok) {
      throw new Error(`All WRIS API endpoints failed. Last error: ${lastError}`);
    }
    
    if (successfulEndpoint && successfulParams) {
      console.log('🎉 Success! Working endpoint:', successfulEndpoint);
      console.log('🎉 Working parameters:', successfulParams);
    }
    
    // Process the response to extract groundwater level data
    console.log('🔍 Processing API response for groundwater data...');
    
    // Try different possible response structures
    let groundwaterData = null;
    let stationInfo = null;
    
    // Structure 1: data.content array
    if (data && data.content && Array.isArray(data.content) && data.content.length > 0) {
      console.log('📊 Found data in content array structure');
      const latestReading = data.content[0];
      groundwaterData = latestReading;
      stationInfo = {
        stationName: latestReading.stationName || latestReading.station_name || 'Unknown Station',
        stateName: latestReading.stateName || latestReading.state_name || stateName,
        districtName: latestReading.districtName || latestReading.district_name || districtName,
        agencyName: latestReading.agencyName || latestReading.agency_name || agencyName,
        lastUpdated: latestReading.date || latestReading.observationDate || latestReading.observation_date
      };
    }
    // Structure 2: data.data array
    else if (data && data.data && Array.isArray(data.data) && data.data.length > 0) {
      console.log('📊 Found data in data array structure');
      const latestReading = data.data[0];
      groundwaterData = latestReading;
      stationInfo = {
        stationName: latestReading.stationName || latestReading.station_name || 'Unknown Station',
        stateName: latestReading.stateName || latestReading.state_name || stateName,
        districtName: latestReading.districtName || latestReading.district_name || districtName,
        agencyName: latestReading.agencyName || latestReading.agency_name || agencyName,
        lastUpdated: latestReading.date || latestReading.observationDate || latestReading.observation_date
      };
    }
    // Structure 3: data.results array
    else if (data && data.results && Array.isArray(data.results) && data.results.length > 0) {
      console.log('📊 Found data in results array structure');
      const latestReading = data.results[0];
      groundwaterData = latestReading;
      stationInfo = {
        stationName: latestReading.stationName || latestReading.station_name || 'Unknown Station',
        stateName: latestReading.stateName || latestReading.state_name || stateName,
        districtName: latestReading.districtName || latestReading.district_name || districtName,
        agencyName: latestReading.agencyName || latestReading.agency_name || agencyName,
        lastUpdated: latestReading.date || latestReading.observationDate || latestReading.observation_date
      };
    }
    // Structure 4: Direct object with groundwater data
    else if (data && (data.groundWaterLevel || data.waterLevel || data.level)) {
      console.log('📊 Found data in direct object structure');
      groundwaterData = data;
      stationInfo = {
        stationName: data.stationName || data.station_name || 'Unknown Station',
        stateName: data.stateName || data.state_name || stateName,
        districtName: data.districtName || data.district_name || districtName,
        agencyName: data.agencyName || data.agency_name || agencyName,
        lastUpdated: data.date || data.observationDate || data.observation_date
      };
    }
    
    if (groundwaterData) {
      // Extract groundwater level value from various possible field names
      const groundwaterLevel = groundwaterData.groundWaterLevel || 
                              groundwaterData.ground_water_level ||
                              groundwaterData.waterLevel || 
                              groundwaterData.water_level ||
                              groundwaterData.level || 
                              groundwaterData.depth ||
                              groundwaterData.groundwater_depth ||
                              'N/A';
      
      console.log('✅ Extracted groundwater level:', groundwaterLevel);
      console.log('✅ Station info:', stationInfo);
      
      return {
        values: [{
          value: [{
            value: groundwaterLevel.toString()
          }]
        }],
        variable: {
          unit: {
            unitCode: 'm'
          }
        },
        rawData: data, // Include raw data for debugging
        stationInfo: stationInfo
      };
    } else {
      // No data found, return null
      console.log('❌ No groundwater data found in any expected structure');
      console.log('📊 Available response keys:', data ? Object.keys(data) : 'No data');
      return null;
    }
    
  } catch (error) {
    console.error("Error fetching groundwater data from WRIS API:", error);
    
    // Return null if API fails - no mock data
    console.log("API failed, returning null for groundwater data");
    return null;
  }
};
