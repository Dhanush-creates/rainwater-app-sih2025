// Copy this file to `api/config.js` and fill in your keys.
// Keys can also be provided via environment variables:
// - ACCUWEATHER_API_KEY
// - GEMINI_API_KEY

export const ACCUWEATHER_API_KEY = "YOUR_ACCUWEATHER_API_KEY_HERE";
export const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_HERE";

// Optional default WRIS location (India codes)
export const DEFAULT_WRIS = {
  stateCode: null, // e.g., 28
  districtCode: null, // e.g., 517
};

// Gemini model to use
export const GEMINI_MODEL = "gemini-1.5-flash";

