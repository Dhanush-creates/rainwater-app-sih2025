import { requestUserGeolocation, saveUserLocation } from "./geolocation.js";
import { getAccuWeatherLocationKey, getRainfallHistory24h, summarizePrecipitation24h } from "./accuweather.js";
import { getGroundWaterLevel, extractLatestGroundwaterReadings } from "./wris.js";
import { assessRWHFeasibility } from "./gemini.js";
import { DEFAULT_WRIS } from "./config.js";
import { promptWrisCodes } from "./prompts.js";

export async function assessRwhForCurrentUser({ wrisPrompt = true } = {}) {
  // 1) Ask for geolocation
  const geo = await requestUserGeolocation();
  saveUserLocation(geo);

  // 2) Resolve AccuWeather location key
  const locKey = await getAccuWeatherLocationKey(geo.lat, geo.lon);

  // 3) Fetch rainfall (24h)
  const rainHist = await getRainfallHistory24h(locKey.locationKey);
  const rainSummary = summarizePrecipitation24h(rainHist);

  // 4) Get WRIS params
  let stateCode = DEFAULT_WRIS.stateCode;
  let districtCode = DEFAULT_WRIS.districtCode;
  if ((!stateCode || !districtCode) && wrisPrompt) {
    try {
      const picked = await Promise.resolve(promptWrisCodes());
      stateCode = picked.stateCode;
      districtCode = picked.districtCode;
    } catch (_) {
      // Leave null; user may supply via UI
    }
  }

  let gwData = null;
  if (stateCode && districtCode) {
    gwData = await getGroundWaterLevel(stateCode, districtCode);
    gwData = extractLatestGroundwaterReadings(gwData);
  }

  // 5) Ask Gemini for feasibility
  const assessment = await assessRWHFeasibility({
    location: { name: locKey.name, administrativeArea: locKey.administrativeArea, country: locKey.country, lat: geo.lat, lon: geo.lon },
    rainfall: { window: "24h", summary: rainSummary },
    groundwater: gwData,
    notes: "Use provided rainfall window as proxy when 1-year data is unavailable.",
  });

  return assessment;
}

