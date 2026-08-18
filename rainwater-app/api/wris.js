import { httpGet } from "./http.js";

// India WRIS: Example endpoint (ensure correct params per API docs)
// https://indiawris.gov.in/api/groundWaterLevel?stateCode=28&districtCode=517
export async function getGroundWaterLevel(stateCode, districtCode) {
  if (!stateCode || !districtCode) {
    throw new Error("stateCode and districtCode are required for WRIS groundwater API");
  }
  const base =
    (typeof import !== "undefined" && typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_WRIS_API_URL) ||
    "https://indiawris.gov.in/api";
  const url = `${base.replace(/\/$/, "")}/groundWaterLevel?stateCode=${encodeURIComponent(stateCode)}&districtCode=${encodeURIComponent(districtCode)}`;
  const data = await httpGet(url);
  // Expecting an array of station records
  if (!data || (typeof data !== "object" && !Array.isArray(data))) {
    throw new Error("Unexpected WRIS response format");
  }
  return data;
}

// Helper to extract the latest groundwater reading per station (if available)
export function extractLatestGroundwaterReadings(records) {
  if (!Array.isArray(records)) return [];
  // Sort by date descending per station, return the latest entries
  const byStation = new Map();
  for (const rec of records) {
    const key = rec.stationCode || rec.stationName || JSON.stringify(rec.location || {});
    const date = new Date(rec.date || rec.Date || rec.observationDate || 0).getTime();
    if (!byStation.has(key) || (date && date > byStation.get(key).ts)) {
      byStation.set(key, { ts: date, record: rec });
    }
  }
  return Array.from(byStation.values()).map((v) => v.record);
}
