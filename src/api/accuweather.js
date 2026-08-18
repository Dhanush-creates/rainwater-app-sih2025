// AccuWeather API — routes through our secure Vercel serverless function.
// The API key stays server-side; the browser only calls /api/weather.

import { httpGet } from "./http.js";

// 1) Resolve AccuWeather locationKey from lat/lon via our secure proxy
export async function getAccuWeatherLocationKey(lat, lon) {
  const url = `/api/weather?action=geoposition&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
  const data = await httpGet(url);
  if (!data || !data.Key) {
    throw new Error("Failed to resolve AccuWeather location key");
  }
  return {
    locationKey: data.Key,
    name: data.EnglishName,
    administrativeArea: data.AdministrativeArea?.EnglishName,
    country: data.Country?.EnglishName,
  };
}

// 2) Fetch 24-hour historical conditions including precipitation summaries
export async function getRainfallHistory24h(locationKey) {
  const url = `/api/weather?action=historical24&locationKey=${encodeURIComponent(locationKey)}`;
  const data = await httpGet(url);
  if (!Array.isArray(data)) {
    throw new Error("Unexpected AccuWeather response for historical/24");
  }
  return data;
}

// Helper: summarize precipitation from the array into totals (mm)
export function summarizePrecipitation24h(historyArray) {
  if (!Array.isArray(historyArray) || historyArray.length === 0)
    return { total24hMm: 0, hourlySumMm: 0 };

  const last = historyArray[historyArray.length - 1];
  const total24hMm =
    last?.PrecipitationSummary?.Past24Hours?.Metric?.Value ?? null;

  let hourlySumMm = 0;
  for (const rec of historyArray) {
    const v = rec?.PrecipitationSummary?.PastHour?.Metric?.Value;
    if (typeof v === "number") hourlySumMm += v;
  }
  return { total24hMm, hourlySumMm };
}
