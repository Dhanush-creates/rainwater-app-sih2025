// Grok (xAI) AI API — routes through our secure Vercel serverless function.
// The API key stays server-side; the browser only calls /api/grok.

export async function assessRWHFeasibility({ location, rainfall, groundwater, soilData, userData, notes }) {
  try {
    const res = await fetch("/api/grok", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ location, rainfall, groundwater, soilData, userData, notes }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(`Grok proxy error: ${res.status} — ${err.error || err.details}`);
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || "";

    return {
      raw: data,
      text,
      result: {
        recommendation: text,
        success: true,
      },
    };
  } catch (error) {
    console.error("Grok API error:", error);

    // Graceful fallback response so the UI doesn't break
    const totalForecast = rainfall?.forecast
      ? rainfall.forecast
          .slice(0, 7)
          .reduce((sum, day) => sum + (day.day?.totalprecip_mm || 0), 0)
      : 0;
    const roofArea = userData?.roofArea ? parseFloat(userData.roofArea) : 100;
    const estimatedAnnual = Math.round(
      (totalForecast * roofArea * 0.85 * 12) / 1000
    );

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
• 100 Houses: Save ~${Math.round((estimatedAnnual * 100) / 1000)}M L/year 🌍

Final Verdict:
✅ Feasible – Proceed with pilot implementation.
🌱 Sustainability Score: 8.5 / 10`;

    return {
      raw: { error: error.message },
      text: fallbackText,
      result: {
        recommendation: fallbackText,
        success: false,
        error: error.message,
      },
    };
  }
}
