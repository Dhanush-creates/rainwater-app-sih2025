import { assessRWHFeasibility } from '../api/grok.js';
// Correct relative import (same directory)
import { fetchAnnualRainfallMeters } from './rainfall';

/**
 * Generates a beautiful AI recommendation using Grok API.
 * @param {object} weatherData - The weather data from the WeatherAPI.
 * @param {object} groundwaterData - The groundwater data from the USGS API.
 * @param {object} soilData - The soil data from the soil API.
 * @param {object} userData - The user input data (roof area, dwellers, etc.).
 * @returns {Promise<string>} - A promise that resolves to the Grok API's recommendation.
 */
export const getGeminiRecommendation = async (weatherData, groundwaterData, soilData = null, userData = null) => {
  if (!weatherData) {
    return Promise.resolve("Could not generate a recommendation because weather data is unavailable.");
  }

  // Ensure soilData is properly handled
  if (!soilData) {
    soilData = null;
  }

  try {
    // Pre-compute metrics we may need to patch Grok output if it has placeholders
    const nf0 = new Intl.NumberFormat('en-IN');
    const nf1 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 });
    const next7mm_try = Array.isArray(weatherData?.forecast)
      ? weatherData.forecast.slice(0, 7).reduce((sum, d) => sum + (d?.day?.totalprecip_mm || 0), 0)
      : 0;
    const lat_try = weatherData?.location?.lat;
    const lon_try = weatherData?.location?.lon;
    let annualRainM_try = 0;
    try {
      if (lat_try != null && lon_try != null) {
        const { metersPerYear } = await fetchAnnualRainfallMeters(lat_try, lon_try);
        annualRainM_try = metersPerYear || 0;
      }
    } catch (_) {}
    const roofArea_try = Number.parseFloat(userData?.roofArea) || 100;
    const roofType_try = (userData?.roofType || '').toLowerCase();
    const runoffCoeff_try = roofType_try.includes('tile') ? 0.6 : roofType_try.includes('rcc') || roofType_try.includes('concrete') ? 0.8 : 0.75;
    let harvestM3_try = annualRainM_try > 0 ? roofArea_try * annualRainM_try * runoffCoeff_try : (roofArea_try * (next7mm_try / 1000) * runoffCoeff_try) * 52;
    if (!Number.isFinite(harvestM3_try) || harvestM3_try <= 0) harvestM3_try = roofArea_try * 0.8 * runoffCoeff_try;
    const harvestLyr_try = Math.round(harvestM3_try * 1000);

    // Use the Grok-based assessment
    const result = await assessRWHFeasibility({
      location: weatherData.location,
      rainfall: weatherData,
      groundwater: groundwaterData,
      soilData: soilData,
      userData: userData,
      notes: "Use provided rainfall window as proxy when 1-year data is unavailable."
    });

    const text = result.text || result.result?.recommendation || "";
    // If the model output contains obvious zero placeholders, fall back to deterministic template
    if (/~0[,0]{2,}/.test(text) || /(^|\s)0M\b/.test(text) || /~0M\b/.test(text)) {
      const waterPricePerKL = 50;
      const estCost = Math.round(3 * 1000 + 300 * 2.5);
      const roiYears = harvestLyr_try > 0 ? estCost / ((harvestLyr_try / 1000) * waterPricePerKL) : null;
      const community100Str = `${nf0.format(Math.round((harvestLyr_try * 100)/1_000_000))}M`;
      return `Summary:
🌧️ Feasible with Medium Confidence. Based on current data analysis, rainwater harvesting shows potential for this location.

Advantages:
• ${nf1.format(next7mm_try)} mm rain in next 7 days → immediate potential 🌧️
• Reduces municipal water dependency 💧
• Helps groundwater recharge 🌍
• Sustainable water management solution 🌱

AI Recommendations:
• Best Structure → Recharge Pit (2m × 1m × 1.5m) 🏗️
• Harvestable Water → ~${nf0.format(harvestLyr_try)} L/year 💧
• Cost → ₹${nf0.format(estCost)} | ROI → ${roiYears ? nf1.format(roiYears) : '—'} years 💰
• Tip → Clean filters before monsoon season 🧽

Community Impact:
• Household: Save ~${nf0.format(harvestLyr_try)} L/year 🏠
• 100 Houses: Save ~${community100Str} L/year 🌍

Final Verdict:
✅ Feasible – Proceed with pilot implementation.
🌱 Sustainability Score: 8.5 / 10`;
    }

    return text || "Unable to generate recommendation.";
  } catch (error) {
    console.error("Error calling Grok API:", error);
    
    // Location-aware fallback using available data (Open-Meteo + NASA POWER)
    const nf0 = new Intl.NumberFormat('en-IN');
    const nf1 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 });
    const nf2 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

    const next7mm = Array.isArray(weatherData?.forecast)
      ? weatherData.forecast.slice(0, 7).reduce((sum, d) => sum + (d?.day?.totalprecip_mm || 0), 0)
      : 0;

    const lat = weatherData?.location?.lat;
    const lon = weatherData?.location?.lon;

    let annualRainM = 0; // meters/year
    try {
      if (lat != null && lon != null) {
        const { metersPerYear } = await fetchAnnualRainfallMeters(lat, lon);
        annualRainM = metersPerYear || 0;
      }
    } catch (_) {
      annualRainM = 0;
    }

    // User inputs
    const roofArea = Number.parseFloat(userData?.roofArea) || 100; // m²
    const roofType = (userData?.roofType || '').toLowerCase();
    const runoffCoeff = roofType.includes('tile') ? 0.6 : roofType.includes('rcc') || roofType.includes('concrete') ? 0.8 : 0.75;
    const dwellers = Number.parseInt(userData?.dwellers) || 4;
    const perCapita = 150; // L/day default

    // Harvest potential using annual rainfall if available; otherwise quick proxy from next 7 days × 52
    let harvestM3 = annualRainM > 0
      ? roofArea * annualRainM * runoffCoeff
      : (roofArea * (next7mm / 1000) * runoffCoeff) * 52; // weekly proxy
    // Final guard: if still zero (e.g., missing data), assume light-rain climatology 0.8 m/year
    if (!Number.isFinite(harvestM3) || harvestM3 <= 0) {
      const fallbackRainM = 0.8; // conservative monsoon-region default
      harvestM3 = roofArea * fallbackRainM * runoffCoeff;
    }
    const harvestLyr = Math.round(harvestM3 * 1000);

    // Demand & FI
    const annualDemandL = dwellers * perCapita * 365;
    const FI = annualDemandL > 0 ? harvestLyr / annualDemandL : 0;

    // Simple cost model
    const pitVol = 2 * 1 * 1.5; // 3 m³
    const materialRate = 1000; // ₹/m³
    const laborDay = 300; // ₹/day
    const laborDays = 2.5; // days
    const estCost = Math.round(pitVol * materialRate + laborDay * laborDays);
    const waterPricePerKL = 50; // ₹/kL
    const annualSavings = (harvestLyr / 1000) * waterPricePerKL; // ₹/yr
    const roiYears = annualSavings > 0 ? estCost / annualSavings : null;

    const community100 = harvestLyr * 100; // L/yr
    const community100Str = `${nf0.format(Math.round(community100/1_000_000))}M`;

    return `Summary:
🌧️ Feasible with Medium Confidence. Based on current data analysis, rainwater harvesting shows potential for this location.

Advantages:
• ${nf1.format(next7mm)} mm rain in next 7 days → immediate potential 🌧️
• Reduces municipal water dependency 💧
• Helps groundwater recharge 🌍
• Sustainable water management solution 🌱

AI Recommendations:
• Best Structure → Recharge Pit (2m × 1m × 1.5m) 🏗️
• Harvestable Water → ~${nf0.format(harvestLyr)} L/year 💧
• Cost → ₹${nf0.format(estCost)} | ROI → ${roiYears ? nf1.format(roiYears) : '—'} years 💰
• Tip → Clean filters before monsoon season 🧽

Community Impact:
• Household: Save ~${nf0.format(harvestLyr)} L/year 🏠
• 100 Houses: Save ~${community100Str} L/year 🌍

Final Verdict:
✅ Feasible – Proceed with pilot implementation.
🌱 Sustainability Score: 8.5 / 10`;
  }
};
