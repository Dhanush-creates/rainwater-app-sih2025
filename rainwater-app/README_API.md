**Rainwater App API Module**

- **Purpose:** Fetch rainfall (AccuWeather), groundwater (India WRIS), request user geolocation, and send data to Gemini to assess Rainwater Harvesting (RWH) feasibility.

**Setup**

- For browser (Vite) projects, copy `.env.example` to `.env.local` and set:
  - `VITE_ACCUWEATHER_API_KEY`
  - `VITE_GEMINI_API_KEY`
  - Optional: `VITE_WEATHER_API_URL`, `VITE_WRIS_API_URL`, `VITE_GEMINI_MODEL`

- For Node/SSR, or if you prefer file-based config, copy `api/config.example.js` to `api/config.js` and set:
  - `ACCUWEATHER_API_KEY`
  - `GEMINI_API_KEY`
  - Optionally set `DEFAULT_WRIS.stateCode` and `DEFAULT_WRIS.districtCode`
- Alternatively, set env vars: `ACCUWEATHER_API_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL`.

**Key Files**

- `api/accuweather.js`: Resolve `locationKey` from lat/lon; fetch 24h rainfall history; summarize precipitation.
- `api/wris.js`: Fetch groundwater data from India WRIS; extract latest readings.
- `api/geolocation.js`: Prompt user for location permission and persist selected location.
- `api/gemini.js`: Send a structured prompt to Gemini and parse a JSON recommendation.
- `api/index.js`: Barrel exports.

**Usage (Browser)**

```js
import {
  requestUserGeolocation,
  saveUserLocation,
  getAccuWeatherLocationKey,
  getRainfallHistory24h,
  summarizePrecipitation24h,
  getGroundWaterLevel,
  extractLatestGroundwaterReadings,
  assessRWHFeasibility,
} from "./api/index.js";

async function runRwhAssessment() {
  // 1) Ask for location permission and store it
  const loc = await requestUserGeolocation(); // { lat, lon, accuracy }
  saveUserLocation(loc);

  // 2) Resolve AccuWeather locationKey
  const { locationKey, name, administrativeArea, country } = await getAccuWeatherLocationKey(loc.lat, loc.lon);

  // 3) Fetch rainfall history (24h)
  const rainArr = await getRainfallHistory24h(locationKey);
  const rainSummary = summarizePrecipitation24h(rainArr); // { total24hMm, hourlySumMm }

  // 4) Get groundwater data (replace with actual codes)
  const wris = await getGroundWaterLevel(28, 517);
  const latestGw = extractLatestGroundwaterReadings(wris);

  // 5) Ask Gemini for feasibility
  const assessment = await assessRWHFeasibility({
    location: { name, administrativeArea, country, lat: loc.lat, lon: loc.lon },
    rainfall: { window: "24h", summary: rainSummary },
    groundwater: latestGw,
    notes: "Use domain judgement; if rainfall is persistently low and groundwater declining, be conservative.",
  });

  console.log("Gemini result:", assessment.result || assessment.text);
}
```

**Notes**

- AccuWeather endpoint provided returns last 24h observations. If you need a 1-year rainfall dataset, you may require additional AccuWeather endpoints/plan; the code is structured to pass whatever rainfall aggregation you compute to Gemini.
- If running in Node < 18, add `node-fetch` and wire it into `api/http.js`.
