// Vercel Serverless Function — Grok (xAI) AI Proxy
// Keeps GROK_API_KEY secret on the server side.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  const API_KEY = process.env.GROK_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: 'Grok API key not configured on server.' });
  }

  const { location, rainfall, groundwater, soilData, userData, notes } = req.body || {};

  // Build comprehensive prompt
  const lines = [];
  lines.push('🌧️ **RAINWATER HARVESTING AI ASSESSMENT** 🌧️');
  lines.push('');
  lines.push('You are an expert hydrologist, civil engineer, and sustainability consultant specializing in rainwater harvesting systems. Analyze the provided data and generate a comprehensive, beautifully formatted recommendation.');
  lines.push('');
  lines.push('REQUIRED OUTPUT FORMAT:');
  lines.push('Generate a detailed assessment in the following exact structure with emojis and formatting:');
  lines.push('');
  lines.push('Summary:');
  lines.push('🌧️ [Feasible/Not Feasible] with [High/Medium/Low] Confidence. [Brief assessment based on actual data]. [Key strengths or limitations].');
  lines.push('');
  lines.push('Advantages:');
  lines.push('• [Benefit 1 with emoji based on actual data]');
  lines.push('• [Benefit 2 with emoji based on actual data]');
  lines.push('• [Benefit 3 with emoji based on actual data]');
  lines.push('');
  lines.push('AI Recommendations:');
  lines.push('• Best Structure → [Recommended system type] ([dimensions])');
  lines.push('• Harvestable Water → ~[X] L/year (calculated from actual data)');
  lines.push('• Cost → ₹[amount] | ROI → [X] years');
  lines.push('• Tip → [Practical advice with emoji]');
  lines.push('');
  lines.push('Community Impact:');
  lines.push('• Household: Save ~[X] L/year');
  lines.push('• 100 Houses: Save ~[X] L/year');
  lines.push('');
  lines.push('Final Verdict:');
  lines.push('✅/❌ [Feasible/Not Feasible] – [Action recommendation].');
  lines.push('🌱 Sustainability Score: [X] / 10');
  lines.push('');
  lines.push('DATA TO ANALYZE:');

  if (location) lines.push(`📍 Location: ${location.name}, ${location.region}, ${location.country} (${location.lat}, ${location.lon})`);
  if (rainfall) {
    lines.push('🌧️ Rainfall Data:');
    lines.push(`   • Current: ${rainfall.current?.precip_mm || 0} mm`);
    if (rainfall.forecast && rainfall.forecast.length > 0) {
      const totalForecast = rainfall.forecast.slice(0, 7).reduce((sum, day) => sum + (day.day?.totalprecip_mm || 0), 0);
      lines.push(`   • 7-day forecast: ${totalForecast} mm total`);
    }
  }
  if (groundwater) {
    lines.push('💧 Groundwater Data:');
    lines.push(`   • Level: ${groundwater.values?.[0]?.value?.[0]?.value || 'N/A'} m`);
    if (groundwater.stationInfo) {
      lines.push(`   • Station: ${groundwater.stationInfo.stationName}`);
    }
  } else {
    lines.push('💧 Groundwater Data: Not available');
  }
  if (soilData) {
    lines.push('🌱 Soil Data:');
    lines.push(`   • Type: ${soilData.most_probable_soil_type || 'Unknown'}`);
    lines.push(`   • Names: ${(soilData.familiar_names || []).join(', ') || 'N/A'}`);
  } else {
    lines.push('🌱 Soil Data: Not available');
  }
  if (userData) {
    lines.push('🏠 User Requirements:');
    lines.push(`   • Roof Area: ${userData.roofArea} m²`);
    lines.push(`   • Dwellers: ${userData.dwellers} people`);
    lines.push(`   • Roof Type: ${userData.roofType}`);
    lines.push(`   • Open Space: ${userData.openSpace} m²`);
  }
  if (notes) lines.push(`📝 Additional Notes: ${notes}`);

  lines.push('');
  lines.push('ANALYSIS REQUIREMENTS:');
  lines.push('1. Calculate realistic water harvesting potential based on ACTUAL roof area and rainfall data');
  lines.push('2. Estimate costs for different system types based on ACTUAL soil conditions');
  lines.push('3. Consider ACTUAL soil type for infiltration vs storage recommendations');
  lines.push('4. Provide specific, actionable recommendations based on REAL data');
  lines.push('5. Use Indian context (₹ currency, local conditions)');
  lines.push('6. Include sustainability and environmental impact based on ACTUAL conditions');
  lines.push('7. Make it visually appealing with appropriate emojis');
  lines.push('8. Base all calculations on the ACTUAL data provided, not generic estimates');
  lines.push('Generate the complete assessment now:');

  const prompt = lines.join('\n');

  const requestBody = {
    model: 'grok-beta',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 2000,
    stream: false,
  };

  try {
    const upstream = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!upstream.ok) {
      const txt = await upstream.text();
      console.error('Grok API error:', upstream.status, txt);
      return res.status(upstream.status).json({ error: `Grok API error: ${upstream.status}`, details: txt });
    }

    const data = await upstream.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('Grok proxy error:', err);
    return res.status(500).json({ error: 'Internal proxy error', details: err.message });
  }
}
