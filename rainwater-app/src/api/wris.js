// India WRIS Groundwater API — routes through our secure Vercel serverless function.
// CORS is handled server-side; the browser only calls /api/groundwater.

import { httpGet } from "./http.js";

export async function getGroundWaterLevel(stateCode, districtCode) {
  if (!stateCode || !districtCode) {
    throw new Error("stateCode and districtCode are required for WRIS groundwater API");
  }
  const url = `/api/groundwater?stateCode=${encodeURIComponent(stateCode)}&districtCode=${encodeURIComponent(districtCode)}`;
  const data = await httpGet(url);
  if (!data || (typeof data !== "object" && !Array.isArray(data))) {
    throw new Error("Unexpected WRIS response format");
  }
  return data;
}

export async function getGroundWaterLevelByName(stateName, districtName) {
  if (!stateName || !districtName) {
    throw new Error("stateName and districtName are required");
  }
  const url = `/api/groundwater?stateName=${encodeURIComponent(stateName)}&districtName=${encodeURIComponent(districtName)}`;
  const data = await httpGet(url);
  return data;
}

// Helper to extract the latest groundwater reading per station (if available)
export function extractLatestGroundwaterReadings(records) {
  if (!Array.isArray(records)) return [];
  const byStation = new Map();
  for (const rec of records) {
    const key =
      rec.stationCode ||
      rec.stationName ||
      JSON.stringify(rec.location || {});
    const date = new Date(
      rec.date || rec.Date || rec.observationDate || 0
    ).getTime();
    if (!byStation.has(key) || (date && date > byStation.get(key).ts)) {
      byStation.set(key, { ts: date, record: rec });
    }
  }
  return Array.from(byStation.values()).map((v) => v.record);
}
