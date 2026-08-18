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

    if (state?.location) {
      getData();
    } else {
      setError('Location not provided.');
      setLoading(false);
    }
  }, [state]);

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

      // Monthly Rainfall Data Section
      yPosition = addSectionHeader('Monthly Rainfall Data (Sample)', yPosition);
      
      const monthlyData = [
        { name: 'Jan', rain: 12 }, { name: 'Feb', rain: 8 }, { name: 'Mar', rain: 15 },
        { name: 'Apr', rain: 22 }, { name: 'May', rain: 80 }, { name: 'Jun', rain: 140 },
        { name: 'Jul', rain: 220 }, { name: 'Aug', rain: 210 }, { name: 'Sep', rain: 160 },
        { name: 'Oct', rain: 60 }, { name: 'Nov', rain: 25 }, { name: 'Dec', rain: 10 },
      ];
      
      monthlyData.forEach(month => {
        const monthText = `${month.name}: ${month.rain} mm`;
        yPosition = addText(monthText, 20, yPosition);
      });
      yPosition += 10;

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

      {/* Removed forecast visualization per request */}


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
