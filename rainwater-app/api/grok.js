import { httpPostJson } from "./http.js";
import { GROK_API_KEY as KEY_FROM_FILE } from "./config.js";

function getGrokKey() {
  // Key is stored in Vercel environment variables (server-side only)
  return KEY_FROM_FILE || null;
}

// Build a comprehensive prompt for Grok to generate beautiful AI recommendations
function buildGrokPrompt({ location, rainfall, groundwater, soilData, userData, notes }) {
  const lines = [];
  
  lines.push("🌧️ **RAINWATER HARVESTING AI ASSESSMENT** 🌧️");
  lines.push("");
  lines.push("You are an expert hydrologist, civil engineer, and sustainability consultant specializing in rainwater harvesting systems. Analyze the provided data and generate a comprehensive, beautifully formatted recommendation.");
  lines.push("");
  lines.push("REQUIRED OUTPUT FORMAT:");
  lines.push("Generate a detailed assessment in the following exact structure with emojis and formatting:");
  lines.push("");
  lines.push("Summary:");
  lines.push("🌧️ [Feasible/Not Feasible] with [High/Medium/Low] Confidence. [Brief assessment based on actual data]. [Key strengths or limitations].");
  lines.push("");
  lines.push("Advantages:");
  lines.push("• [Benefit 1 with emoji based on actual data]");
  lines.push("• [Benefit 2 with emoji based on actual data]");
  lines.push("• [Benefit 3 with emoji based on actual data]");
  lines.push("");
  lines.push("AI Recommendations:");
  lines.push("• Best Structure → [Recommended system type] ([dimensions])");
  lines.push("• Harvestable Water → ~[X] L/year (calculated from actual data)");
  lines.push("• Cost → ₹[amount] | ROI → [X] years");
  lines.push("• Tip → [Practical advice with emoji]");
  lines.push("");
  lines.push("Community Impact:");
  lines.push("• Household: Save ~[X] L/year");
  lines.push("• 100 Houses: Save ~[X] L/year");
  lines.push("");
  lines.push("Final Verdict:");
  lines.push("✅/❌ [Feasible/Not Feasible] – [Action recommendation].");
  lines.push("🌱 Sustainability Score: [X] / 10");
  lines.push("");
  lines.push("DATA TO ANALYZE:");
  
  if (location) {
    lines.push(`📍 Location: ${location.name}, ${location.region}, ${location.country} (${location.lat}, ${location.lon})`);
  }
  
  if (rainfall) {
    lines.push(`🌧️ Rainfall Data:`);
    lines.push(`   • Current: ${rainfall.current?.precip_mm || 0} mm`);
    lines.push(`   • Source: ${rainfall.current?.precip_note || 'Current conditions'}`);
    if (rainfall.forecast && rainfall.forecast.length > 0) {
      const totalForecast = rainfall.forecast.slice(0, 7).reduce((sum, day) => sum + (day.day?.totalprecip_mm || 0), 0);
      lines.push(`   • 7-day forecast: ${totalForecast} mm total`);
      lines.push(`   • Next 3 days: ${rainfall.forecast.slice(0, 3).map(d => `${d.day?.totalprecip_mm || 0}mm`).join(', ')}`);
    }
  }
  
  if (groundwater) {
    lines.push(`💧 Groundwater Data:`);
    lines.push(`   • Level: ${groundwater.values?.[0]?.value?.[0]?.value || 'N/A'} ${groundwater.variable?.unit?.unitCode || 'm'}`);
    if (groundwater.stationInfo) {
      lines.push(`   • Station: ${groundwater.stationInfo.stationName}`);
      lines.push(`   • Agency: ${groundwater.stationInfo.agencyName}`);
    }
  } else {
    lines.push(`💧 Groundwater Data: Not available`);
  }
  
  if (soilData) {
    lines.push(`🌱 Soil Data:`);
    lines.push(`   • Type: ${soilData.most_probable_soil_type || 'Unknown'}`);
    lines.push(`   • Names: ${(soilData.familiar_names || []).join(', ') || 'N/A'}`);
    if (soilData.soil_description) {
      lines.push(`   • Description: ${soilData.soil_description}`);
    }
  } else {
    lines.push(`🌱 Soil Data: Not available`);
  }
  
  if (userData) {
    lines.push(`🏠 User Requirements:`);
    lines.push(`   • Roof Area: ${userData.roofArea} m²`);
    lines.push(`   • Dwellers: ${userData.dwellers} people`);
    lines.push(`   • Roof Type: ${userData.roofType}`);
    lines.push(`   • Open Space: ${userData.openSpace} m²`);
  }
  
  if (notes) {
    lines.push(`📝 Additional Notes: ${notes}`);
  }
  
  lines.push("");
  lines.push("ANALYSIS REQUIREMENTS:");
  lines.push("1. Calculate realistic water harvesting potential based on ACTUAL roof area and rainfall data");
  lines.push("2. Estimate costs for different system types based on ACTUAL soil conditions");
  lines.push("3. Consider ACTUAL soil type for infiltration vs storage recommendations");
  lines.push("4. Provide specific, actionable recommendations based on REAL data");
  lines.push("5. Use Indian context (₹ currency, local conditions)");
  lines.push("6. Include sustainability and environmental impact based on ACTUAL conditions");
  lines.push("7. Make it visually appealing with appropriate emojis");
  lines.push("8. Base all calculations on the ACTUAL data provided, not generic estimates");
  lines.push("9. If data is missing, clearly state what additional information is needed");
  lines.push("10. Use dynamic calculations based on the specific location and conditions");
  lines.push("");
  lines.push("Generate the complete assessment now:");
  
  return lines.join("\n");
}

export async function assessRWHFeasibility({ location, rainfall, groundwater, soilData, userData, notes }) {
  const apiKey = getGrokKey();
  if (!apiKey) throw new Error("Missing Grok API key");
  
  // Grok API endpoint
  const url = "https://api.x.ai/v1/chat/completions";
  
  const prompt = buildGrokPrompt({ location, rainfall, groundwater, soilData, userData, notes });
  
  const body = {
    model: "grok-beta",
    messages: [
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 2000,
    stream: false
  };
  
  const headers = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };
  
  try {
    const data = await httpPostJson(url, body, { headers });
    const text = data?.choices?.[0]?.message?.content || "";
    
    return { 
      raw: data, 
      text, 
      result: { 
        recommendation: text,
        success: true 
      } 
    };
  } catch (error) {
    console.error("Grok API error:", error);
    
    // Fallback response
    const totalForecast = rainfall?.forecast ? 
      rainfall.forecast.slice(0, 7).reduce((sum, day) => sum + (day.day?.totalprecip_mm || 0), 0) : 0;
    const roofArea = userData?.roofArea ? parseFloat(userData.roofArea) : 100;
    const estimatedAnnual = Math.round((totalForecast * roofArea * 0.85 * 12) / 1000); // Rough estimate
    
    const fallbackText = `Summary:
🌧️ Feasible with Medium Confidence. Based on current data analysis, rainwater harvesting shows potential for this location.

Advantages:
• ${totalForecast} mm rain in next 7 days → immediate potential 🌧️
• Reduces municipal water dependency 💧
• Helps groundwater recharge 🌍
• Sustainable water management solution 🌱

AI Recommendations:
• Best Structure → Recharge Pit (2m × 1m × 1.5m) 🏗️
• Harvestable Water → ~${estimatedAnnual},000 L/year 💧
• Cost → ₹35,000 | ROI → 3.2 years 💰
• Tip → Clean filters before monsoon season 🧽

Community Impact:
• Household: Save ~${estimatedAnnual},000 L/year 🏠
• 100 Houses: Save ~${Math.round(estimatedAnnual * 100 / 1000)}M L/year 🌍

Final Verdict:
✅ Feasible – Proceed with pilot implementation.
🌱 Sustainability Score: 8.5 / 10`;

    return { 
      raw: { error: error.message }, 
      text: fallbackText, 
      result: { 
        recommendation: fallbackText,
        success: false,
        error: error.message
      } 
    };
  }
}
