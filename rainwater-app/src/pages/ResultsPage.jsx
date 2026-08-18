import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import { useLanguage } from '../contexts/LanguageContext';
import MonthlyRainfallChart from '../components/MonthlyRainfallChart';
import GroundwaterDataForm from '../components/GroundwaterDataForm';
import GroundwaterLevelAnimation from '../components/GroundwaterLevelAnimation';
import { fetchWeatherData, fetchGroundwaterData, testWRISAPI } from '../utils/fetchData';
import { fetchSoilByCoords, fetchSoilByLocation } from '../utils/soil';
import { fetchLocalGroundwaterByCoords } from '../utils/groundwaterLocal';
import { getGeminiRecommendation } from '../utils/gemini';
import { fetchAnnualRainfallMeters, RUNOFF_COEFFICIENTS } from '../utils/rainfall';

const ResultCard = ({ icon, title, value, delay = 0, color = "emerald" }) => (
  <motion.div
    initial={{ opacity: 0, y: 30, scale: 0.9 }}
    whileInView={{ opacity: 1, y: 0, scale: 1 }}
    viewport={{ once: true }}
    transition={{ 
      duration: 0.6, 
      delay: delay,
      ease: "easeOut"
    }}
    whileHover={{ 
      scale: 1.05, 
      y: -5,
      transition: { duration: 0.2 }
    }}
    className={`card relative overflow-hidden group cursor-pointer bg-gradient-to-br from-white to-${color}-50 border-${color}-200 hover:shadow-xl transition-all duration-300`}
  >
    {/* Animated background */}
    <motion.div
      className={`absolute inset-0 bg-gradient-to-br from-${color}-100 to-${color}-200 opacity-0 group-hover:opacity-20 transition-opacity duration-300`}
      initial={{ scale: 0 }}
      whileHover={{ scale: 1 }}
    transition={{ duration: 0.3 }}
    />
    
    {/* Icon with animation */}
    <motion.div 
      className="text-3xl mb-2 relative z-10"
      animate={{ 
        rotate: [0, 5, -5, 0],
        scale: [1, 1.1, 1]
      }}
      transition={{ 
        duration: 2,
        repeat: Infinity,
        repeatDelay: 3
      }}
    >
      {icon}
    </motion.div>
    
    <div className="text-sm text-slate-600 font-medium mb-1 relative z-10">{title}</div>
    <motion.div 
      className={`text-xl font-bold text-${color}-700 relative z-10`}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ delay: delay + 0.3 }}
    >
      {value}
    </motion.div>
    
    {/* Shine effect */}
    <motion.div
      className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20"
      initial={{ x: "-100%" }}
      whileHover={{ x: "100%" }}
      transition={{ duration: 0.6 }}
    />
  </motion.div>
);

export default function ResultsPage() {
  const { state } = useLocation();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [groundwaterData, setGroundwaterData] = useState(null);
  const [soilData, setSoilData] = useState(null);
  const [soilError, setSoilError] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [showGroundwaterForm, setShowGroundwaterForm] = useState(false);
  const [groundwaterLoading, setGroundwaterLoading] = useState(false);
  
  const [soilLoading, setSoilLoading] = useState(false);

  // RWH: annual rainfall and user-tunable inputs
  const [annualRainfallM, setAnnualRainfallM] = useState(null); // meters/year
  const [annualRainfallSource, setAnnualRainfallSource] = useState('');
  const [annualRainfallLoading, setAnnualRainfallLoading] = useState(false);
  const [annualRainfallError, setAnnualRainfallError] = useState(null);
  const [rwhRoofArea, setRwhRoofArea] = useState(() => {
    const v = parseFloat(state?.roofArea);
    return Number.isFinite(v) ? v : '';
  });
  const [rwhCoeffKey, setRwhCoeffKey] = useState('concrete');

  // AR Structures defaults (derive basic defaults from soil)
  const inferSoilClass = (s) => {
    const key = (s?.familiar_names?.[0] || s?.most_probable_soil_type || '').toLowerCase();
    if (key.includes('sand')) return 'sand';
    if (key.includes('loam') || key.includes('sandy loam')) return 'loam';
    if (key.includes('clay')) return 'clay';
    return 'loam';
  };
  const soilClass = inferSoilClass(soilData || {});
  const defaultsBySoil = {
    sand: { infil: 0.10, K: 0.10 }, // m/hr
    loam: { infil: 0.02, K: 0.02 },
    clay: { infil: 0.005, K: 0.005 },
  };
  const soilDefaults = defaultsBySoil[soilClass] || defaultsBySoil.loam;

  const [pitArea, setPitArea] = useState(5);        // m²
  const [pitDepth, setPitDepth] = useState(2);      // m
  const [pitInfil, setPitInfil] = useState(soilDefaults.infil); // m/hr

  const [trenchL, setTrenchL] = useState(10); // m
  const [trenchW, setTrenchW] = useState(0.8); // m
  const [trenchD, setTrenchD] = useState(2); // m

  const [shaftD, setShaftD] = useState(0.6); // diameter in m
  const [shaftH, setShaftH] = useState(10); // m (screened thickness)
  const [shaftK, setShaftK] = useState(soilDefaults.K); // m/hr

  // Feasibility Index inputs
  const [fiDwellers, setFiDwellers] = useState(() => {
    const v = parseInt(state?.dwellers);
    return Number.isFinite(v) && v > 0 ? v : 4;
  });
  const [fiPerCapita, setFiPerCapita] = useState(150); // L/person/day

  // Cost Estimation inputs
  const [costMaterialRate, setCostMaterialRate] = useState(1000); // ₹ per m³
  const [costLaborPerDay, setCostLaborPerDay] = useState(300); // ₹/day
  const [costLaborDays, setCostLaborDays] = useState(2.5); // days
  const [waterPricePerKL, setWaterPricePerKL] = useState(50); // ₹ per kL (1000 L)
  const [overrideStructureVol, setOverrideStructureVol] = useState(''); // optional m³
  const [costBase, setCostBase] = useState('auto'); // 'auto' | 'pit' | 'trench' | 'shaft'

  // AR Structure preview state
  const [showARPreview, setShowARPreview] = useState(false);
  const [arPreviewType, setArPreviewType] = useState('pit'); // 'pit' | 'trench' | 'shaft'

  useEffect(() => {
    const getData = async () => {
      try {
        const weather = await fetchWeatherData(state.location);
        setWeatherData(weather);

        // Don't fetch groundwater data automatically - user needs to provide parameters
        // const groundwater = await fetchGroundwaterData(weather.location);
        // setGroundwaterData(groundwater);

        // Fetch soil data using coordinates or location
        setSoilLoading(true);
        setSoilError(null);
        let soilData = null;
        try {
          if (weather?.location?.lat != null && weather?.location?.lon != null) {
            soilData = await fetchSoilByCoords(weather.location.lat, weather.location.lon);
          } else if (state?.location) {
            soilData = await fetchSoilByLocation(state.location);
          }
          if (soilData) setSoilData(soilData);
        } catch (e) {
          console.warn('Soil fetch failed:', e);
          setSoilError(e?.message || 'Failed to load soil data');
        } finally {
          setSoilLoading(false);
        }

        // Attempt to auto-load groundwater from local Excel-based API
        let groundwaterData = null;
        try {
          if (weather?.location?.lat != null && weather?.location?.lon != null) {
            groundwaterData = await fetchLocalGroundwaterByCoords(weather.location.lat, weather.location.lon);
            if (groundwaterData) setGroundwaterData(groundwaterData);
          }
        } catch (e) {
          console.warn('Local groundwater fetch failed:', e);
        }

        console.log('Generating recommendation with data:', {
          weather: !!weather,
          groundwaterData: !!groundwaterData,
          soilData: !!soilData,
          state: !!state
        });
        
        const geminiRecommendation = await getGeminiRecommendation(weather, groundwaterData, soilData, state);
        setRecommendation(geminiRecommendation);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    getData();
  }, []);

  // Fetch annual rainfall from NASA POWER when coordinates are available
  useEffect(() => {
    const fetchAnnual = async () => {
      if (!weatherData?.location?.lat || !weatherData?.location?.lon) return;
      try {
        setAnnualRainfallLoading(true);
        setAnnualRainfallError(null);
        const { metersPerYear, source } = await fetchAnnualRainfallMeters(
          weatherData.location.lat,
          weatherData.location.lon
        );
        setAnnualRainfallM(metersPerYear);
        setAnnualRainfallSource(source);
      } catch (e) {
        setAnnualRainfallError(e.message || 'Failed to load annual rainfall');
      } finally {
        setAnnualRainfallLoading(false);
      }
    };
    fetchAnnual();
  }, [weatherData?.location?.lat, weatherData?.location?.lon]);

  const handleGroundwaterSubmit = async (params) => {
    setGroundwaterLoading(true);
    try {
      console.log('🌊 Fetching groundwater data for location:', params);
      const groundwater = await fetchGroundwaterData(params);
      
      if (groundwater) {
        console.log('✅ Groundwater data fetched successfully:', groundwater);
        setGroundwaterData(groundwater);
        setShowGroundwaterForm(false);
        
        // Update recommendation with new groundwater data
        if (weatherData) {
          const geminiRecommendation = await getGeminiRecommendation(weatherData, groundwater, soilData, state);
          setRecommendation(geminiRecommendation);
        }
        
        alert(`✅ Groundwater data updated successfully!\n\nLocation: ${params.stateName}, ${params.districtName}\nAgency: ${params.agencyName}\n\nData has been loaded into the groundwater section.`);
      } else {
        console.log('❌ No groundwater data found for the specified parameters');
        alert(`❌ No groundwater data found for the specified location.\n\nLocation: ${params.stateName}, ${params.districtName}\nAgency: ${params.agencyName}\n\nPlease try:\n• Different state/district combination\n• Different agency (SWID, GSDA)\n• Different date range\n• Check if the location has groundwater monitoring stations`);
        setShowGroundwaterForm(false);
      }
    } catch (err) {
      console.error('Error fetching groundwater data:', err);
      alert(`❌ Error fetching groundwater data: ${err.message}\n\nPlease try again or check the console for more details.`);
    } finally {
      setGroundwaterLoading(false);
    }
  };

  const handleGroundwaterCancel = () => {
    setShowGroundwaterForm(false);
  };

  const handleTestAPI = async () => {
    setGroundwaterLoading(true);
    try {
      console.log('Testing WRIS API...');
      const result = await testWRISAPI();
      console.log('Test result:', result);
      if (result && !result.isMockData) {
        alert('API test successful! Real data fetched.');
        setGroundwaterData(result);
      } else {
        alert('API test failed. Check console for details.');
      }
    } catch (error) {
      console.error('API test error:', error);
      alert('API test failed: ' + error.message);
    } finally {
      setGroundwaterLoading(false);
    }
  };

  const handleTestProxyAPI = async () => {
    setGroundwaterLoading(true);
    try {
      console.log('Testing proxy API directly...');
      const response = await fetch('http://localhost:3001/test-api', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });
      
      const result = await response.json();
      console.log('Proxy API test result:', result);
      
      if (response.ok) {
        const summary = result.summary;
        const htmlResponses = result.results.filter(r => r.isHtml).length;
        const jsonResponses = result.results.filter(r => r.isJson).length;
        
        // Find the first successful JSON response
        const successfulResult = result.results.find(r => r.status && r.status < 400 && r.isJson);
        
        if (successfulResult) {
          console.log('🎉 Found successful API response:', successfulResult);
          
          // Try to parse and use the real data
          try {
            const apiData = JSON.parse(successfulResult.body);
            console.log('📊 Parsed API data:', apiData);
            
            // Update groundwater data with real API response
            setGroundwaterData({
              values: [{
                value: [{
                  value: 'Real API Data Available'
                }]
              }],
              variable: {
                unit: {
                  unitCode: 'm'
                }
              },
              rawData: apiData,
              stationInfo: {
                stationName: 'Real API Station',
                stateName: 'API Data',
                districtName: 'Real Data',
                agencyName: 'WRIS API',
                lastUpdated: new Date().toISOString().split('T')[0]
              },
              isMockData: false,
              note: 'Real data fetched from India WRIS API!',
              apiResponse: successfulResult
            });
            
            alert(`✅ Real API data fetched successfully!\n\nEndpoint: ${successfulResult.endpoint}\nStatus: ${successfulResult.status}\n\nData has been loaded into the groundwater section.`);
          } catch (parseError) {
            console.error('Error parsing API response:', parseError);
            alert(`API test successful but data parsing failed. Check console for details.`);
          }
        } else {
          let message = `API Test Complete!\n\n`;
          message += `Total endpoints tested: ${summary.total}\n`;
          message += `Successful responses: ${summary.successful}\n`;
          message += `JSON responses: ${jsonResponses}\n`;
          message += `HTML responses: ${htmlResponses}\n\n`;
          message += `Check console for detailed results.`;
          
          alert(message);
        }
      } else {
        alert('Proxy API test failed. Check console for details.');
      }
    } catch (error) {
      console.error('Proxy API test error:', error);
      alert('Proxy API test failed: ' + error.message);
    } finally {
      setGroundwaterLoading(false);
    }
  };

  const handleTestProxy = async () => {
    try {
      console.log('Testing proxy server basic functionality...');
      const response = await fetch('http://localhost:3001/test', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      const result = await response.json();
      console.log('Proxy basic test result:', result);
      
      if (response.ok) {
        alert(`Proxy server is working! Response: ${result.message}`);
      } else {
        alert('Proxy server test failed. Check console for details.');
      }
    } catch (error) {
      console.error('Proxy basic test error:', error);
      alert('Proxy server is not running or not accessible: ' + error.message);
    }
  };

  const handleDebugAPI = async () => {
    try {
      console.log('🔍 Debugging API response structure...');
      const testParams = {
        stateName: 'tamil nadu',
        districtName: 'chennai',
        agencyName: 'cgwb',
        startdate: '2020-09-13',
        enddate: '2025-09-13',
        page: 0,
        size: 10
      };
      
      const groundwater = await fetchGroundwaterData(testParams);
      console.log('🔍 Debug result:', groundwater);
      
      if (groundwater) {
        alert(`✅ Debug successful! Found groundwater data.\n\nCheck console for detailed response structure.`);
      } else {
        alert(`❌ Debug completed - No data found.\n\nCheck console for detailed API response structure and available fields.`);
      }
    } catch (error) {
      console.error('Debug API error:', error);
      alert('Debug failed: ' + error.message);
    }
  };


  const handlePdf = () => {
    if (!weatherData || !state) {
      alert('Data not available for PDF generation. Please ensure all data has loaded.');
      return;
    }

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;

      // Helper function to check if we need a new page
      const checkPageBreak = (requiredSpace = 20) => {
        if (yPosition + requiredSpace > pageHeight - 50) {
          doc.addPage();
          yPosition = 20;
          return true;
        }
        return false;
      };

      // Helper function to add text with word wrapping and page breaks
      const addText = (text, x, y, maxWidth = pageWidth - 40, fontSize = 12) => {
        doc.setFontSize(fontSize);
        const lines = doc.splitTextToSize(text, maxWidth);
        const lineHeight = fontSize * 0.4;
        const totalHeight = lines.length * lineHeight + 5;
        
        // Check if we need a page break before adding text
        if (y + totalHeight > pageHeight - 50) {
          doc.addPage();
          y = 20;
        }
        
        doc.text(lines, x, y);
        return y + totalHeight;
      };

      // Helper function to add a section header
      const addSectionHeader = (title, y) => {
        // Check if we need a page break for the header
        if (y + 30 > pageHeight - 50) {
          doc.addPage();
          y = 20;
        }
        
        doc.setFontSize(16);
        doc.setTextColor(52, 168, 83); // emerald-600 color
        doc.setFont(undefined, 'bold');
        y = addText(title, 20, y, pageWidth - 40, 16);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'normal');
        return y + 5;
      };

    // Title
    doc.setFontSize(24);
    doc.setTextColor(52, 168, 83);
    doc.setFont(undefined, 'bold');
    doc.text('Rainwater Harvesting Assessment Report', 20, yPosition);
    yPosition += 15;

    // Report date
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, yPosition);
    yPosition += 20;

    // Site Information Section
    yPosition = addSectionHeader('Site Information', yPosition);
    
    const siteInfo = [
      `Name: ${state.name || 'Not provided'}`,
      `Location: ${state.location}`,
      `Roof Area: ${state.roofArea} m²`,
      `Number of Dwellers: ${state.dwellers}`,
      `Available Open Space: ${state.openSpace} m²`,
      `Roof Type: ${state.roofType}`
    ];
    
    siteInfo.forEach(info => {
      yPosition = addText(info, 20, yPosition);
    });
    yPosition += 10;

    // Weather Data Section
    yPosition = addSectionHeader('Current Weather Conditions', yPosition);
    
    const weatherInfo = [
      `Location: ${weatherData.location.name}, ${weatherData.location.region}, ${weatherData.location.country}`,
      `Current Temperature: ${weatherData.current.temp_c}°C`,
      `Current Precipitation: ${weatherData.current.precip_mm} mm`,
      `Weather Condition: ${weatherData.current.condition.text}`
    ];
    
    weatherInfo.forEach(info => {
      yPosition = addText(info, 20, yPosition);
    });
    yPosition += 10;

      // Soil Information Section
      yPosition = addSectionHeader('Soil Information', yPosition);
      if (soilData) {
        const soilLines = [
          `Location: ${soilData.location_name || 'N/A'}`,
          `Most Probable Type: ${soilData.most_probable_soil_type || 'N/A'}`,
          `Familiar Names: ${(soilData.familiar_names || []).join(', ') || 'N/A'}`,
        ];
        soilLines.forEach(line => { yPosition = addText(line, 20, yPosition); });
        if (soilData.soil_description) {
          yPosition = addText(`Description: ${soilData.soil_description}`, 20, yPosition);
        }
        if (soilData.probabilities && soilData.probabilities.length > 0) {
          yPosition = addText('Other Probable Types:', 20, yPosition);
          soilData.probabilities.slice(0, 3).forEach(p => {
            const probPct = Math.round((p.probability || 0) * 100);
            const line = `- ${p.soil_type} (${probPct}%) — ${(p.familiar_names || []).join(', ')}`;
            yPosition = addText(line, 25, yPosition);
          });
        }
        yPosition += 10;
      } else {
        yPosition = addText('Soil data not available.', 20, yPosition);
        yPosition += 10;
      }

      // Groundwater Data Section
      if (groundwaterData) {
        yPosition = addSectionHeader('Groundwater Information', yPosition);
        const groundwaterInfo = `Groundwater Level: ${groundwaterData.values[0].value[0].value} ${groundwaterData.variable.unit.unitCode}`;
        yPosition = addText(groundwaterInfo, 20, yPosition);
        
        if (groundwaterData.stationInfo) {
          const stationInfo = [
            `Station: ${groundwaterData.stationInfo.stationName}`,
            `State: ${groundwaterData.stationInfo.stateName}`,
            `District: ${groundwaterData.stationInfo.districtName}`,
            `Agency: ${groundwaterData.stationInfo.agencyName}`,
            `Last Updated: ${groundwaterData.stationInfo.lastUpdated || 'N/A'}`
          ];
          stationInfo.forEach(info => {
            yPosition = addText(info, 20, yPosition);
          });
        }
        
        if (groundwaterData.isMockData) {
          yPosition = addText('Note: Using fallback data due to API unavailability', 20, yPosition);
          yPosition = addText(groundwaterData.note, 20, yPosition);
        }
        
        yPosition += 10;
      } else {
        yPosition = addSectionHeader('Groundwater Information', yPosition);
        yPosition = addText('Groundwater data not available. Please use the "Fetch Real Data" button to get actual data from India WRIS API.', 20, yPosition);
        yPosition += 10;
      }

      // 7-Day Forecast Section removed per user request

      // AI Recommendation Section
      yPosition = addSectionHeader('AI-Powered Recommendation', yPosition);
      if (recommendation) {
        // Clean HTML tags from recommendation
        const cleanRecommendation = recommendation.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
        yPosition = addText(cleanRecommendation, 20, yPosition);
      } else {
        yPosition = addText('AI recommendation not available at this time.', 20, yPosition);
      }
      yPosition += 10;

      // Monthly data removed from PDF display (kept internally if needed for calculations)
      const monthlyData = [
        { name: 'Jan', rain: 12 }, { name: 'Feb', rain: 8 }, { name: 'Mar', rain: 15 },
        { name: 'Apr', rain: 22 }, { name: 'May', rain: 80 }, { name: 'Jun', rain: 140 },
        { name: 'Jul', rain: 220 }, { name: 'Aug', rain: 210 }, { name: 'Sep', rain: 160 },
        { name: 'Oct', rain: 60 }, { name: 'Nov', rain: 25 }, { name: 'Dec', rain: 10 },
      ];
      // Note: not printed to PDF per request

      // Rainwater Harvesting Calculations
      yPosition = addSectionHeader('Rainwater Harvesting Potential', yPosition);
      
      // Calculate potential rainwater collection
      const annualRainfall = monthlyData.reduce((sum, month) => sum + month.rain, 0);
      const roofArea = parseFloat(state.roofArea) || 0;
      const runoffCoefficient = state.roofType === 'RCC' ? 0.85 : state.roofType === 'Tiled' ? 0.75 : 0.9;
      const potentialCollection = (annualRainfall * roofArea * runoffCoefficient / 1000).toFixed(2);
      
      const calculations = [
        `Annual Rainfall: ${annualRainfall} mm`,
        `Roof Area: ${roofArea} m²`,
        `Runoff Coefficient (${state.roofType}): ${(runoffCoefficient * 100).toFixed(0)}%`,
        `Potential Annual Collection: ${potentialCollection} m³ (${(potentialCollection * 1000).toFixed(0)} liters)`,
        `Daily Average: ${(potentialCollection * 1000 / 365).toFixed(0)} liters/day`
      ];
      
      calculations.forEach(calc => {
        yPosition = addText(calc, 20, yPosition);
      });
      yPosition += 10;

      // Artificial Recharge (AR) Structures
      yPosition = addSectionHeader('Artificial Recharge (AR) Structures', yPosition);

      // Recharge Pit
      const pitVolume = (Number(pitArea) || 0) * (Number(pitDepth) || 0); // m³
      const pitCapacity = (Number(pitArea) || 0) * (Number(pitInfil) || 0); // m³/hr
      const pitLines = [
        `Recharge Pit:`,
        `- Inputs: A=${pitArea} m², h=${pitDepth} m, Infiltration=${pitInfil} m/hr`,
        `- Volume V = A × h = ${pitVolume.toFixed(2)} m³`,
        `- Recharge capacity ≈ A × infiltration = ${pitCapacity.toFixed(2)} m³/hr`
      ];
      pitLines.forEach(line => { yPosition = addText(line, 25, yPosition); });
      yPosition += 5;

      // Recharge Trench
      const trenchVolume = (Number(trenchL) || 0) * (Number(trenchW) || 0) * (Number(trenchD) || 0);
      const trenchLines = [
        `Recharge Trench:`,
        `- Inputs: L=${trenchL} m, W=${trenchW} m, D=${trenchD} m`,
        `- Volume V = L × W × D = ${trenchVolume.toFixed(2)} m³`
      ];
      trenchLines.forEach(line => { yPosition = addText(line, 25, yPosition); });
      yPosition += 5;

      // Recharge Shaft
      const shaftArea = Math.PI * Math.pow(Number(shaftD) || 0, 2) / 4; // m²
      const shaftDischarge = shaftArea * (Number(shaftH) || 0) * (Number(shaftK) || 0); // m³/hr
      const shaftLines = [
        `Recharge Shaft (deep aquifer):`,
        `- Inputs: D=${shaftD} m, h=${shaftH} m, K=${shaftK} m/hr`,
        `- Area term (π D² / 4) = ${shaftArea.toFixed(2)} m²`,
        `- Discharge Q = (π D² / 4) × h × K = ${shaftDischarge.toFixed(2)} m³/hr`
      ];
      shaftLines.forEach(line => { yPosition = addText(line, 25, yPosition); });
      yPosition += 10;

      // Feasibility Index (FI)
      yPosition = addSectionHeader('Feasibility Index (FI)', yPosition);
      const coeffFI = RUNOFF_COEFFICIENTS.find(o => o.key === rwhCoeffKey)?.value || 0;
      const areaFI = Number(rwhRoofArea) || 0; // m²
      const rainFI = annualRainfallM || 0; // m/year
      const harvestM3FI = areaFI * rainFI * coeffFI; // m³/year
      const harvestLitersFI = Math.round(harvestM3FI * 1000);
      const annualDemandLFI = Math.round((fiDwellers || 0) * (fiPerCapita || 0) * 365);
      const FIFloat = annualDemandLFI > 0 ? (harvestLitersFI / annualDemandLFI) : 0;
      let fiStatus = 'Low feasibility';
      if (FIFloat >= 1) fiStatus = 'Fully feasible';
      else if (FIFloat >= 0.5) fiStatus = 'Partial feasibility';

      const fiLines = [
        `Harvest Potential: ${harvestM3FI.toFixed(2)} m³/yr (${harvestLitersFI.toLocaleString()} L/yr)`,
        `Annual Water Demand: ${annualDemandLFI.toLocaleString()} L/yr (People: ${fiDwellers}, Per-capita: ${fiPerCapita} L/day)`,
        `FI = Harvest / Demand = ${FIFloat.toFixed(2)} (${fiStatus})`
      ];
      fiLines.forEach(line => { yPosition = addText(line, 20, yPosition); });
      yPosition += 10;

      // Cost Estimation
      yPosition = addSectionHeader('Cost Estimation', yPosition);
      const trenchVpdf = (Number(trenchL)||0) * (Number(trenchW)||0) * (Number(trenchD)||0);
      const structureVpdf = (overrideStructureVol !== '' ? Math.max(0, Number(overrideStructureVol)||0) : trenchVpdf);
      const materialCostPdf = structureVpdf * (Number(costMaterialRate)||0);
      const laborCostPdf = (Number(costLaborPerDay)||0) * (Number(costLaborDays)||0);
      const totalCostPdf = Math.round(materialCostPdf + laborCostPdf);
      const harvestM3Pdf = areaFI * rainFI * coeffFI; // same as FI harvest
      const annualSavingsPdf = harvestM3Pdf * (Number(waterPricePerKL)||0); // ₹/yr
      const paybackPdf = annualSavingsPdf > 0 ? (totalCostPdf / annualSavingsPdf) : Infinity;
      const costLines = [
        `Structure Volume: ${structureVpdf.toFixed(2)} m³`,
        `Estimated Cost: ₹${totalCostPdf.toLocaleString()}`,
        `Payback: ${Number.isFinite(paybackPdf) ? paybackPdf.toFixed(1) : '—'} years`
      ];
      costLines.forEach(line => { yPosition = addText(line, 20, yPosition); });
      yPosition += 10;

      // Additional Analysis Section
      yPosition = addSectionHeader('Additional Analysis', yPosition);
      
      const analysis = [
        `Water Demand (${state.dwellers} people): ${(parseInt(state.dwellers) * 150).toFixed(0)} liters/day (150L per person)`,
        `Annual Water Demand: ${(parseInt(state.dwellers) * 150 * 365 / 1000).toFixed(1)} m³`,
        `Collection vs Demand: ${((potentialCollection * 1000) / (parseInt(state.dwellers) * 150 * 365) * 100).toFixed(1)}% of annual demand`,
        `Storage Recommendation: ${Math.max(potentialCollection * 0.1, 2).toFixed(1)} m³ minimum storage tank`
      ];
      
      analysis.forEach(item => {
        yPosition = addText(item, 20, yPosition);
      });
      yPosition += 10;

      // Footer - ensure it's on the last page
      if (yPosition + 30 > pageHeight - 50) {
        doc.addPage();
        yPosition = 20;
      }
      
      // Position footer at bottom of page
      yPosition = Math.max(yPosition, pageHeight - 30);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('This report is generated by the Rainwater Harvesting Assessment Tool', 20, yPosition);
      doc.text('Powered by real-time weather data and AI recommendations', 20, yPosition + 8);

      // Save the PDF
      const fileName = `rainwater-assessment-${state.name || 'report'}-${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);
      
      // Show success message
      alert('PDF report generated successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  const handleShare = () => {
    alert('Share link copied (stub).');
  };

  if (loading) {
    return (
      <motion.div 
        className="flex items-center justify-center min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
      <div className="text-center">
          <motion.div 
            className="relative mb-8"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <div className="w-16 h-16 border-4 border-emerald-200 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-emerald-500 rounded-full animate-spin"></div>
            <div className="absolute top-2 left-2 w-12 h-12 border-4 border-transparent border-t-blue-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </motion.div>

      
          
          <motion.h2 
            className="text-2xl font-bold text-emerald-700 mb-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            🌧️ {t('results.loading')}
          </motion.h2>
          
          <motion.p 
            className="text-slate-600 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {t('results.loadingSubtitle')}
          </motion.p>
          
          <motion.div 
            className="flex justify-center space-x-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-emerald-500 rounded-full"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2
                }}
              />
            ))}
          </motion.div>
      </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div 
        className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-orange-50"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div 
          className="text-center bg-white rounded-2xl shadow-xl p-8 max-w-lg mx-auto border border-red-200"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div 
            className="text-6xl mb-4"
            animate={{ 
              rotate: [0, -10, 10, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              repeatDelay: 3
            }}
          >
            ⚠️
          </motion.div>
          
          <motion.h3 
            className="text-2xl font-bold text-red-700 mb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {t('results.error')}
          </motion.h3>
          
          <motion.p 
            className="text-red-600 mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            {error}
          </motion.p>
          
          <motion.div 
            className="text-sm text-red-600 mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <p className="mb-4 font-semibold">{t('results.errorSubtitle')}</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'New York', 'London', 'Tokyo'].map((city, index) => (
                <motion.button
                  key={city}
                  onClick={() => window.history.back()}
                  className="bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded-full text-sm transition-all duration-200 hover:scale-105"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1 + (index * 0.1) }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {city}
                </motion.button>
              ))}
            </div>
          </motion.div>
          
          <motion.button 
            onClick={() => window.history.back()} 
            className="btn-primary bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white px-6 py-3 rounded-lg font-semibold shadow-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
          >
            🔄 {t('results.goBack')}
          </motion.button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header Section */}
      <motion.div 
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div>
          <motion.h2 
            className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            {t('results.title')} {weatherData?.location?.name || state.location}
          </motion.h2>
          <motion.p 
            className="text-slate-600 text-sm mt-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            {t('results.subtitle')}
          </motion.p>
        </div>
        <motion.div 
          className="flex gap-3"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <motion.button 
            onClick={handlePdf} 
            className="btn-ghost hover:bg-emerald-100 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            📄 {t('results.downloadReport')}
          </motion.button>
          <motion.button 
            onClick={handleShare} 
            className="btn-primary bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            🔗 {t('results.share')}
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Main Data Cards */}
      <motion.div 
        className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <ResultCard 
          icon="🌡️" 
          title={t('results.currentTemperature')} 
          value={`${weatherData.current.temp_c}°C`} 
          delay={0}
          color="red"
        />
        
        <ResultCard 
          icon="💧" 
          title={t('results.precipitation')} 
          value={`${weatherData.current.precip_mm} mm`}
          delay={0.1}
          color="blue"
        />
        
        <ResultCard 
          icon="🧪" 
          title={t('results.soilType')} 
          value={soilLoading ? t('results.loadingData') : (soilData ? (soilData.familiar_names?.[0] || soilData.most_probable_soil_type) : t('results.notAvailable'))}
          delay={0.2}
          color="green"
        />
      </motion.div>

      {/* Groundwater Section with Animation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <motion.h3 
          className="text-2xl font-bold text-center mb-6 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
        >
          💧 {t('results.groundwaterAnalysis')}
        </motion.h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Groundwater Animation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.2 }}
          >
            <GroundwaterLevelAnimation 
              currentLevel={groundwaterData?.values?.[0]?.value?.[0]?.value}
              isVisible={!!groundwaterData}
            />
          </motion.div>
          
          {/* Groundwater Info */}
          <motion.div
            className="card bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.4 }}
          >
            <div className="text-3xl mb-4 text-center">⛲</div>
            <div className="text-lg font-semibold text-center mb-4 text-blue-700">
            {groundwaterData ? 
              `${groundwaterData.values[0].value[0].value} ${groundwaterData.variable.unit.unitCode}` : 
              t('results.notAvailable')
            }
          </div>
            
          {groundwaterData?.stationInfo && (
              <div className="space-y-2 text-sm text-slate-600">
                <div>📍 {t('results.station')}: {groundwaterData.stationInfo.stationName}</div>
                <div>🏢 {t('results.agency')}: {groundwaterData.stationInfo.agencyName}</div>
                <div>📅 {t('results.lastUpdated')}: {groundwaterData.stationInfo.lastUpdated || 'N/A'}</div>
            </div>
          )}
            
          {groundwaterData?.isMockData && (
              <div className="mt-4 p-3 bg-orange-100 rounded-lg text-sm text-orange-700">
                <div className="font-semibold">⚠️ {t('results.usingFallbackData')}</div>
                <div className="text-xs mt-1">{groundwaterData.note}</div>
            </div>
          )}
          </motion.div>
        </div>
      </motion.div>


      {/* AI Recommendation Section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6 }}
      >
        <motion.h3 
          className="text-2xl font-bold mb-6 flex items-center justify-center gap-3"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.8 }}
        >
          <motion.span 
            className="text-3xl"
            animate={{ 
              rotate: [0, 10, -10, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              repeatDelay: 4
            }}
          >
            🤖
          </motion.span>
          <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            {t('results.aiRecommendation')}
          </span>
        </motion.h3>
        
        <motion.div 
          className="card bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 shadow-xl"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 2 }}
          whileHover={{ 
            scale: 1.02,
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
          }}
        >
          <motion.div 
            className="prose prose-sm max-w-none text-left relative"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.2 }}
            dangerouslySetInnerHTML={{ 
              __html: recommendation
                .replace(/\*\*(.*?)\*\*/g, '<strong class="text-purple-700">$1</strong>')
                .replace(/\n/g, '<br />')
                .replace(/✅/g, '<span class="text-green-600 text-xl animate-pulse">✅</span>')
                .replace(/❌/g, '<span class="text-red-600 text-xl animate-pulse">❌</span>')
                .replace(/🌧️/g, '<span class="text-blue-500 text-lg">🌧️</span>')
                .replace(/💧/g, '<span class="text-blue-400 text-lg">💧</span>')
                .replace(/🌱/g, '<span class="text-green-500 text-lg">🌱</span>')
                .replace(/🏠/g, '<span class="text-orange-500 text-lg">🏠</span>')
                .replace(/🌍/g, '<span class="text-emerald-500 text-lg">🌍</span>')
                .replace(/💰/g, '<span class="text-yellow-600 text-lg">💰</span>')
                .replace(/🏗️/g, '<span class="text-gray-600 text-lg">🏗️</span>')
                .replace(/🧽/g, '<span class="text-blue-300 text-lg">🧽</span>')
            }} 
          />
          
          {/* Animated background pattern */}
          <motion.div
            className="absolute inset-0 opacity-5 pointer-events-none"
            animate={{
              backgroundPosition: ["0% 0%", "100% 100%"]
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              repeatType: "reverse"
            }}
            style={{
              backgroundImage: "radial-gradient(circle at 20% 50%, #8b5cf6 0%, transparent 50%), radial-gradient(circle at 80% 20%, #ec4899 0%, transparent 50%), radial-gradient(circle at 40% 80%, #06b6d4 0%, transparent 50%)"
            }}
          />
        </motion.div>
      </motion.div>

      {/* Rainwater Harvesting Potential */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.2 }}
        className="mt-10"
      >
        <motion.h3 
          className="text-2xl font-bold mb-6 text-center bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          💧 Rainwater Harvesting Potential
        </motion.h3>

        <div className="card bg-gradient-to-br from-emerald-50 to-cyan-50 border-emerald-200">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Roof Area (m²)</label>
              <input
                type="number"
                min="0"
                value={rwhRoofArea}
                onChange={(e) => setRwhRoofArea(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-400 outline-none"
                placeholder="e.g., 100"
              />
              {state?.roofArea && (
                <div className="text-xs text-slate-500 mt-1">From input: {state.roofArea} m²</div>
              )}
            </div>

            <div>
              <label className="block text-sm text-slate-600 mb-1">Runoff Coefficient</label>
              <select
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-400 outline-none"
                value={rwhCoeffKey}
                onChange={(e) => setRwhCoeffKey(e.target.value)}
              >
                {RUNOFF_COEFFICIENTS.map(opt => (
                  <option key={opt.key} value={opt.key}>{opt.label} ({opt.value})</option>
                ))}
              </select>
              <div className="text-xs text-slate-500 mt-1">Typical: Concrete 0.8, Tiled 0.6, Unpaved 0.3–0.5</div>
            </div>

            <div>
              <label className="block text-sm text-slate-600 mb-1">Annual Rainfall (m/year)</label>
              <div className="px-3 py-2 border rounded-lg bg-white">
                {annualRainfallLoading && <span>Loading…</span>}
                {!annualRainfallLoading && annualRainfallError && (
                  <span className="text-red-600">{annualRainfallError}</span>
                )}
                {!annualRainfallLoading && !annualRainfallError && (
                  <span>{annualRainfallM != null ? annualRainfallM.toFixed(2) : '—'}</span>
                )}
              </div>
              {annualRainfallSource && (
                <div className="text-xs text-slate-500 mt-1">Source: {annualRainfallSource}</div>
              )}
            </div>
          </div>

          {/* Computation */}
          <div className="mt-6 grid md:grid-cols-3 gap-4 items-stretch">
            <ResultCard
              icon="📐"
              title="Roof Area"
              value={`${rwhRoofArea || 0} m²`}
              color="emerald"
            />
            <ResultCard
              icon="☔"
              title="Annual Rainfall"
              value={`${annualRainfallM != null ? (annualRainfallM * 1000).toFixed(0) : '—'} mm/year`}
              color="cyan"
            />
            <ResultCard
              icon="🏠"
              title="Runoff Coefficient"
              value={`${(RUNOFF_COEFFICIENTS.find(o => o.key === rwhCoeffKey)?.value || 0).toFixed(2)}`}
              color="sky"
            />
          </div>

          {(() => {
            const coeff = RUNOFF_COEFFICIENTS.find(o => o.key === rwhCoeffKey)?.value || 0;
            const area = Number(rwhRoofArea) || 0;
            const rain = annualRainfallM || 0; // m/year
            const volumeM3 = area * rain * coeff; // m³/year
            const litersPerDay = volumeM3 * 1000 / 365;
            return (
              <div className="mt-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="card bg-white/70">
                    <div className="text-sm text-slate-600">Calculated RWH Volume</div>
                    <div className="text-2xl font-bold text-emerald-700">{volumeM3.toFixed(2)} m³ / year</div>
                    <div className="text-xs text-slate-500 mt-1">≈ {(volumeM3 * 1000).toFixed(0)} liters / year</div>
                  </div>
                  <div className="card bg-white/70">
                    <div className="text-sm text-slate-600">Daily Equivalent</div>
                    <div className="text-2xl font-bold text-cyan-700">{Math.round(litersPerDay)} L / day</div>
                    <div className="text-xs text-slate-500 mt-1">Assumes uniform distribution</div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </motion.div>

      {/* Removed forecast visualization per request */}

      {/* Artificial Recharge (AR) Structures */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.4 }}
        className="mt-6"
      >
        <motion.h3 
          className="text-2xl font-bold mb-6 text-center bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          🏗️ Artificial Recharge (AR) Structures
        </motion.h3>

        <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-slate-600">
              Soil defaults detected: <strong className="text-slate-700 uppercase">{soilClass}</strong> · Infiltration ≈ {pitInfil} m/hr · Permeability K ≈ {shaftK} m/hr
            </div>
            <button
              onClick={() => { setArPreviewType('pit'); setShowARPreview(true); }}
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 shadow"
            >
              👁️ Preview structures
            </button>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Recharge Pit */}
            <div className="card bg-white/70">
              <div className="text-lg font-semibold text-blue-700 mb-2">Recharge Pit</div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <label className="flex flex-col">Area A (m²)
                  <input type="number" min="0" value={pitArea}
                    onChange={(e)=>setPitArea(Math.max(0, Number(e.target.value||0)))}
                    className="mt-1 px-2 py-1 border rounded"/>
                </label>
                <label className="flex flex-col">Depth h (m)
                  <input type="number" min="0" value={pitDepth}
                    onChange={(e)=>setPitDepth(Math.max(0, Number(e.target.value||0)))}
                    className="mt-1 px-2 py-1 border rounded"/>
                </label>
                <label className="flex flex-col col-span-2">Infiltration (m/hr)
                  <input type="number" min="0" step="0.001" value={pitInfil}
                    onChange={(e)=>setPitInfil(Math.max(0, Number(e.target.value||0)))}
                    className="mt-1 px-2 py-1 border rounded"/>
                </label>
              </div>
              {(()=>{
                const V = pitArea * pitDepth; // m³
                const Q = pitArea * pitInfil; // m³/hr
                return (
                  <div className="mt-3 text-sm">
                    <div className="font-medium">Volume: <span className="text-blue-700">{V.toFixed(2)}</span> m³</div>
                    <div className="text-slate-600">Recharge capacity: <span className="text-blue-700">{Q.toFixed(2)}</span> m³/hr</div>
                  </div>
                );
              })()}
            </div>

            {/* Recharge Trench */}
            <div className="card bg-white/70">
              <div className="text-lg font-semibold text-blue-700 mb-2">Recharge Trench</div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <label className="flex flex-col">L (m)
                  <input type="number" min="0" value={trenchL}
                    onChange={(e)=>setTrenchL(Math.max(0, Number(e.target.value||0)))}
                    className="mt-1 px-2 py-1 border rounded"/>
                </label>
                <label className="flex flex-col">W (m)
                  <input type="number" min="0" step="0.1" value={trenchW}
                    onChange={(e)=>setTrenchW(Math.max(0, Number(e.target.value||0)))}
                    className="mt-1 px-2 py-1 border rounded"/>
                </label>
                <label className="flex flex-col">D (m)
                  <input type="number" min="0" step="0.1" value={trenchD}
                    onChange={(e)=>setTrenchD(Math.max(0, Number(e.target.value||0)))}
                    className="mt-1 px-2 py-1 border rounded"/>
                </label>
              </div>
              {(()=>{
                const V = trenchL * trenchW * trenchD; // m³
                return (
                  <div className="mt-3 text-sm">
                    <div className="font-medium">Volume: <span className="text-blue-700">{V.toFixed(2)}</span> m³</div>
                  </div>
                );
              })()}
            </div>

            {/* Recharge Shaft */}
            <div className="card bg-white/70">
              <div className="text-lg font-semibold text-blue-700 mb-2">Recharge Shaft</div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <label className="flex flex-col">D (m)
                  <input type="number" min="0" step="0.1" value={shaftD}
                    onChange={(e)=>setShaftD(Math.max(0, Number(e.target.value||0)))}
                    className="mt-1 px-2 py-1 border rounded"/>
                </label>
                <label className="flex flex-col">h (m)
                  <input type="number" min="0" step="0.1" value={shaftH}
                    onChange={(e)=>setShaftH(Math.max(0, Number(e.target.value||0)))}
                    className="mt-1 px-2 py-1 border rounded"/>
                </label>
                <label className="flex flex-col">K (m/hr)
                  <input type="number" min="0" step="0.001" value={shaftK}
                    onChange={(e)=>setShaftK(Math.max(0, Number(e.target.value||0)))}
                    className="mt-1 px-2 py-1 border rounded"/>
                </label>
              </div>
              {(()=>{
                const area = Math.PI * Math.pow(shaftD,2) / 4; // m²
                const Q = area * shaftH * shaftK; // m³/hr
                return (
                  <div className="mt-3 text-sm">
                    <div className="font-medium">Discharge: <span className="text-blue-700">{Q.toFixed(2)}</span> m³/hr</div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Feasibility Index (proposed) */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.6 }}
        className="mt-6"
      >
        <motion.h3 
          className="text-2xl font-bold mb-6 text-center bg-gradient-to-r from-amber-600 to-rose-600 bg-clip-text text-transparent"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          📊 Feasibility Index (FI)
        </motion.h3>

        <div className="card bg-gradient-to-br from-amber-50 to-rose-50 border-amber-200">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Number of people</label>
              <input
                type="number"
                min="1"
                value={fiDwellers}
                onChange={(e)=>setFiDwellers(Math.max(1, parseInt(e.target.value||1)))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-400 outline-none"
              />
              {state?.dwellers && (
                <div className="text-xs text-slate-500 mt-1">From input: {state.dwellers}</div>
              )}
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Per capita demand (L/day)</label>
              <input
                type="number"
                min="1"
                value={fiPerCapita}
                onChange={(e)=>setFiPerCapita(Math.max(1, Number(e.target.value||1)))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-400 outline-none"
              />
              <div className="text-xs text-slate-500 mt-1">Typical urban guideline: 150 L/person/day</div>
            </div>
          </div>

          {(()=>{
            const coeff = RUNOFF_COEFFICIENTS.find(o => o.key === rwhCoeffKey)?.value || 0;
            const area = Number(rwhRoofArea) || 0; // m²
            const rain = annualRainfallM || 0; // m/year
            const harvestM3 = area * rain * coeff; // m³/year
            const harvestLiters = harvestM3 * 1000; // L/year
            const annualDemandL = (fiDwellers || 0) * (fiPerCapita || 0) * 365;
            const FI = annualDemandL > 0 ? (harvestLiters / annualDemandL) : 0;
            let status = 'Low feasibility';
            let color = 'text-rose-700';
            if (FI >= 1) { status = 'Fully feasible'; color = 'text-emerald-700'; }
            else if (FI >= 0.5) { status = 'Partial feasibility'; color = 'text-amber-700'; }

            return (
              <div className="mt-6 grid md:grid-cols-3 gap-4 items-stretch">
                <ResultCard
                  icon="💧"
                  title="Harvest Potential"
                  value={`${harvestM3.toFixed(2)} m³/yr (${Math.round(harvestLiters).toLocaleString()} L/yr)`}
                  color="emerald"
                />
                <ResultCard
                  icon="👥"
                  title="Annual Water Demand"
                  value={`${Math.round(annualDemandL).toLocaleString()} L/yr`}
                  color="orange"
                />
                <ResultCard
                  icon="📈"
                  title="Feasibility Index (FI)"
                  value={`${FI.toFixed(2)} — ${status}`}
                  color={FI >= 1 ? 'emerald' : (FI >= 0.5 ? 'amber' : 'rose')}
                />
              </div>
            );
          })()}
        </div>
      </motion.div>

      {/* Cost Estimation */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.8 }}
        className="mt-6"
      >
        <motion.h3 
          className="text-2xl font-bold mb-6 text-center bg-gradient-to-r from-yellow-600 to-emerald-600 bg-clip-text text-transparent"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          💰 Cost Estimation
        </motion.h3>

        <div className="card bg-gradient-to-br from-yellow-50 to-emerald-50 border-yellow-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
            <div className="flex flex-col gap-1">
              <label className="block text-sm text-slate-600">Material cost (₹/m³)</label>
              <input type="number" min="0" value={costMaterialRate}
                onChange={(e)=>setCostMaterialRate(Math.max(0, Number(e.target.value||0)))}
                className="w-full h-10 px-3 border rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none"/>
              <div className="text-xs text-slate-500 mt-1">Typical: ₹800–₹1200 per m³</div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="block text-sm text-slate-600">Labor (₹/day)</label>
              <input type="number" min="0" value={costLaborPerDay}
                onChange={(e)=>setCostLaborPerDay(Math.max(0, Number(e.target.value||0)))}
                className="w-full h-10 px-3 border rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none"/>
              <div className="text-xs text-slate-500 mt-1">Typical: ₹200–₹400</div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="block text-sm text-slate-600">Labor days</label>
              <input type="number" min="0" step="0.5" value={costLaborDays}
                onChange={(e)=>setCostLaborDays(Math.max(0, Number(e.target.value||0)))}
                className="w-full h-10 px-3 border rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none"/>
              <div className="text-xs text-slate-500 mt-1">Typical: 2–3 days</div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="block text-sm text-slate-600">Water price (₹/kL)</label>
              <input type="number" min="0" value={waterPricePerKL}
                onChange={(e)=>setWaterPricePerKL(Math.max(0, Number(e.target.value||0)))}
                className="w-full h-10 px-3 border rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none"/>
              <div className="text-xs text-slate-500 mt-1">Used for payback estimation</div>
            </div>
            <div className="flex flex-col gap-1 lg:col-span-1 col-span-2">
              <label className="block text-sm text-slate-600">Structure volume (m³) override</label>
              <input type="number" min="0" step="0.1" value={overrideStructureVol}
                onChange={(e)=>setOverrideStructureVol(e.target.value)}
                className="w-full h-10 px-3 border rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none"/>
              <div className="text-xs text-slate-500 mt-1">Optional: otherwise uses max(pit, trench) volume</div>
            </div>
            <div className="flex flex-col gap-1 lg:col-span-1 col-span-2">
              <label className="block text-sm text-slate-600">Base structure for auto volume</label>
              <select
                className="w-full h-10 px-3 border rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none"
                value={costBase}
                onChange={(e)=>setCostBase(e.target.value)}
              >
                <option value="auto">Auto (max of pit/trench)</option>
                <option value="pit">Pit</option>
                <option value="trench">Trench</option>
                <option value="shaft">Shaft</option>
              </select>
              <div className="text-xs text-slate-500 mt-1">Ignored if override volume is provided</div>
            </div>
            <div className="lg:col-span-6 col-span-1 text-xs text-slate-600 mt-2 pt-2 border-t">
              <div className="font-semibold mb-1">Assumptions:</div>
              <ul className="list-disc pl-5 space-y-1">
                <li>Material cost includes basic excavation, brickwork/concrete, filter media, cover slab and minor fittings.</li>
                <li>Labor covers typical excavation, placement and finishing for small-scale AR works (2–3 worker-days).</li>
                <li>Excludes design/permits, dewatering, pumps/plumbing beyond basic fittings, contingencies and GST.</li>
              </ul>
            </div>
          </div>

          {(()=>{
            // Compute volumes
            const pitV = (Number(pitArea)||0) * (Number(pitDepth)||0);
            const trenchV = (Number(trenchL)||0) * (Number(trenchW)||0) * (Number(trenchD)||0);
            const shaftArea = Math.PI * Math.pow(Number(shaftD)||0, 2) / 4;
            const shaftV = shaftArea * (Number(shaftH)||0);
            let baseV = trenchV;
            let baseLabel = 'trench';
            if (costBase === 'pit') { baseV = pitV; baseLabel = 'pit'; }
            else if (costBase === 'trench') { baseV = trenchV; baseLabel = 'trench'; }
            else if (costBase === 'shaft') { baseV = shaftV; baseLabel = 'shaft'; }
            else { // auto
              baseV = Math.max(pitV, trenchV);
              baseLabel = baseV === pitV ? 'pit' : 'trench';
            }
            // Choose representative structure volume
            const structureV = overrideStructureVol !== '' ? Math.max(0, Number(overrideStructureVol)||0) : baseV;
            const materialCost = structureV * (Number(costMaterialRate)||0);
            const laborCost = (Number(costLaborPerDay)||0) * (Number(costLaborDays)||0);
            const totalCost = materialCost + laborCost;

            // Typical range bands
            const MAT_MIN = 800, MAT_MAX = 1200;
            const LAB_MIN = 200, LAB_MAX = 400;
            const DAYS_MIN = 2, DAYS_MAX = 3;
            const minCost = structureV * MAT_MIN + LAB_MIN * DAYS_MIN;
            const maxCost = structureV * MAT_MAX + LAB_MAX * DAYS_MAX;

            // Harvest potential from FI section
            const coeff = RUNOFF_COEFFICIENTS.find(o => o.key === rwhCoeffKey)?.value || 0;
            const area = Number(rwhRoofArea) || 0; // m²
            const rain = annualRainfallM || 0; // m/year
            const harvestM3 = area * rain * coeff; // m³/yr
            const harvestKL = harvestM3; // 1 m³ = 1 kL
            const annualSavings = harvestKL * (Number(waterPricePerKL)||0); // ₹/yr
            const paybackYears = annualSavings > 0 ? (totalCost / annualSavings) : Infinity;

            return (
              <div className="mt-6 grid md:grid-cols-3 gap-4 items-stretch">
                <ResultCard
                  icon="🧱"
                  title="Estimated Structure Volume"
                  value={`${structureV.toFixed(2)} m³${overrideStructureVol!=='' ? '' : ` (base: ${baseLabel})`}`}
                  color="yellow"
                />
                <ResultCard
                  icon="💸"
                  title="Estimated Cost"
                  value={`₹${Math.round(totalCost).toLocaleString()} (range ₹${Math.round(minCost).toLocaleString()}–₹${Math.round(maxCost).toLocaleString()})`}
                  color="emerald"
                />
                <ResultCard
                  icon="⏳"
                  title="Payback Period"
                  value={`${Number.isFinite(paybackYears) ? paybackYears.toFixed(1) : '—'} years`}
                  color="orange"
                />
              </div>
            );
          })()}
        </div>
      </motion.div>

      {/* Floating AR Structure Viewer */}
      {showARPreview && (
        <div className="fixed bottom-4 right-4 z-50 w-[360px] md:w-[420px] bg-white/95 backdrop-blur border rounded-2xl shadow-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold text-slate-700 flex items-center gap-2">
              <span>🏗️ Structure viewer</span>
              <select
                className="px-2 py-1 text-sm border rounded-lg"
                value={arPreviewType}
                onChange={(e)=>setArPreviewType(e.target.value)}
              >
                <option value="pit">Recharge Pit</option>
                <option value="trench">Recharge Trench</option>
                <option value="shaft">Recharge Shaft</option>
              </select>
            </div>
            <button onClick={()=>setShowARPreview(false)} className="text-slate-500 hover:text-slate-700">✖</button>
          </div>
          {/* Simple schematic using SVG; not to scale, only indicative */}
          {arPreviewType === 'pit' && (
            <div>
              <div className="text-xs text-slate-500 mb-1">Indicative cross-section</div>
              <svg viewBox="0 0 300 180" className="w-full h-40">
                <rect x="40" y="30" width="220" height="120" rx="8" fill="#dbeafe" stroke="#2563eb" />
                <line x1="40" y1="30" x2="40" y2="150" stroke="#1f2937" strokeDasharray="4 4"/>
                <line x1="260" y1="30" x2="260" y2="150" stroke="#1f2937" strokeDasharray="4 4"/>
                <text x="150" y="25" textAnchor="middle" fill="#334155" fontSize="12">Pit Volume ≈ A × h</text>
                <text x="10" y="95" transform="rotate(-90 10,95)" textAnchor="middle" fill="#334155" fontSize="12">h = {pitDepth} m</text>
                <text x="150" y="165" textAnchor="middle" fill="#334155" fontSize="12">A = {pitArea} m²</text>
              </svg>
              <div className="text-xs text-slate-600">Volume: {(pitArea * pitDepth).toFixed(2)} m³ · Infiltration: {(pitArea * pitInfil).toFixed(2)} m³/hr</div>
            </div>
          )}
          {arPreviewType === 'trench' && (
            <div>
              <div className="text-xs text-slate-500 mb-1">Indicative top/section</div>
              <svg viewBox="0 0 300 180" className="w-full h-40">
                <rect x="40" y="60" width="220" height="60" rx="6" fill="#dcfce7" stroke="#059669" />
                <text x="150" y="55" textAnchor="middle" fill="#14532d" fontSize="12">Trench Volume ≈ L × W × D</text>
                <text x="150" y="140" textAnchor="middle" fill="#14532d" fontSize="12">L={trenchL} m · W={trenchW} m · D={trenchD} m</text>
              </svg>
              <div className="text-xs text-slate-600">Volume: {(trenchL * trenchW * trenchD).toFixed(2)} m³</div>
            </div>
          )}
          {arPreviewType === 'shaft' && (
            <div>
              <div className="text-xs text-slate-500 mb-1">Indicative section</div>
              <svg viewBox="0 0 300 180" className="w-full h-40">
                <circle cx="150" cy="80" r="35" fill="#fce7f3" stroke="#db2777" />
                <line x1="150" y1="20" x2="150" y2="140" stroke="#db2777" strokeDasharray="4 4"/>
                <text x="150" y="20" textAnchor="middle" fill="#831843" fontSize="12">D={shaftD} m</text>
                <text x="150" y="160" textAnchor="middle" fill="#831843" fontSize="12">h={shaftH} m · K={shaftK} m/hr</text>
              </svg>
              <div className="text-xs text-slate-600">Discharge: {(Math.PI * Math.pow(shaftD,2) / 4 * shaftH * shaftK).toFixed(2)} m³/hr</div>
            </div>
          )}
        </div>
      )}

      {/* Groundwater Data Form Modal */}
      {showGroundwaterForm && (
        <GroundwaterDataForm
          onSubmit={handleGroundwaterSubmit}
          onCancel={handleGroundwaterCancel}
          isLoading={groundwaterLoading}
          currentLocation={weatherData?.location}
        />
      )}
    </motion.div>
  );
}
