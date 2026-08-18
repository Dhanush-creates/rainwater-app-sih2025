import { httpGet } from "./http.js";
import { ACCUWEATHER_API_KEY as KEY_FROM_FILE } from "./config.js";

function getAccuWeatherKey() {
  // Prefer Vite env in browser
  const viteKey = (typeof import !== "undefined" && typeof import.meta !== "undefined" && import.meta.env && (
    import.meta.env.VITE_ACCUWEATHER_API_KEY || import.meta.env.VITE_WEATHER_API_KEY
  )) || null;
  if (viteKey) return viteKey;
  // Node/SSR or file-based
  const nodeKey = (typeof process !== "undefined" && process.env && process.env.ACCUWEATHER_API_KEY) || null;
  if (nodeKey) return nodeKey;
  return KEY_FROM_FILE || null;
}

// Docs: https://developer.accuweather.com/apis
// 1) Resolve AccuWeather locationKey from lat/lon
export async function getAccuWeatherLocationKey(lat, lon) {
  const key = getAccuWeatherKey();
  if (!key) throw new Error("Missing AccuWeather API key");
  const base =
    (typeof import !== "undefined" && typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_WEATHER_API_URL) ||
    "https://dataservice.accuweather.com";
  const url = `${base.replace(/\/$/, "")}/locations/v1/cities/geoposition/search?apikey=${encodeURIComponent(
    key
  )}&q=${encodeURIComponent(`${lat},${lon}`)}`;
  const data = await httpGet(url);
  // Expected object with Key and EnglishName
  if (!data || !data.Key) {
    throw new Error("Failed to resolve AccuWeather location key");
  }
  return { locationKey: data.Key, name: data.EnglishName, administrativeArea: data.AdministrativeArea?.EnglishName, country: data.Country?.EnglishName };
}

// 2) Fetch 24-hour historical conditions including precipitation summaries
// Endpoint: /currentconditions/v1/{locationKey}/historical/24
export async function getRainfallHistory24h(locationKey) {
  const key = getAccuWeatherKey();
  if (!key) throw new Error("Missing AccuWeather API key");
  const base =
    (typeof import !== "undefined" && typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_WEATHER_API_URL) ||
    "https://dataservice.accuweather.com";
  const url = `${base.replace(/\/$/, "")}/currentconditions/v1/${encodeURIComponent(
    locationKey
  )}/historical/24?apikey=${encodeURIComponent(key)}`;
  const data = await httpGet(url);
  if (!Array.isArray(data)) {
    throw new Error("Unexpected AccuWeather response for historical/24");
  }
  return data;
}

// Helper: summarize precipitation from the array into totals (mm)
export function summarizePrecipitation24h(historyArray) {
  // The response typically includes multiple observations. We'll take the last entry's PrecipitationSummary.Past24Hours.Metric.Value if present,
  // and also compute a simple aggregation of PastHour values where available.
  if (!Array.isArray(historyArray) || historyArray.length === 0) return { total24hMm: 0, hourlySumMm: 0 };

  const last = historyArray[historyArray.length - 1];
  const total24hMm = last?.PrecipitationSummary?.Past24Hours?.Metric?.Value ?? null;

  let hourlySumMm = 0;
  for (const rec of historyArray) {
    const v = rec?.PrecipitationSummary?.PastHour?.Metric?.Value;
    if (typeof v === "number") hourlySumMm += v;
  }
  return { total24hMm, hourlySumMm };
}
