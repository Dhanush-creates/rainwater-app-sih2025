// API Configuration for Rainwater Harvesting App
// All sensitive API keys are processed server-side through /api/* endpoints in production.

export const ACCUWEATHER_API_KEY = import.meta.env.VITE_ACCUWEATHER_API_KEY || null;
export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || null;
export const GROK_API_KEY = import.meta.env.VITE_GROK_API_KEY || null;
export const WRIS_API_URL = import.meta.env.VITE_WRIS_API_URL || "https://indiawris.gov.in/api";