/**
 * Soil data client for Flask backend
 */

import { getFamiliarSoilNames } from './soilCommon';

const SOIL_API_BASE = import.meta.env.VITE_SOIL_API_BASE || 'http://localhost:5000';

const callOpenEpiDirect = async (lat, lon, topK = 3) => {
  const url = `https://api.openepi.io/soil/type?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&top_k=${encodeURIComponent(topK)}`;
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OpenEPI error: ${res.status} ${res.statusText} ${text}`);
  }
  const data = await res.json();
  // Normalize to the structure our backend returns where possible
  const familiar = getFamiliarSoilNames(data?.properties?.most_probable_soil_type);
  return {
    coordinates: { lat, lon },
    location_name: null,
    most_probable_soil_type: data?.properties?.most_probable_soil_type,
    familiar_names: familiar.familiar_names,
    soil_description: familiar.description,
    probabilities: data?.properties?.probabilities || [],
    geometry: data?.geometry || {},
    type: data?.type || 'Feature',
    _source: 'openepi-direct'
  };
};

export const fetchSoilByCoords = async (lat, lon) => {
  if (lat == null || lon == null) throw new Error('Latitude and longitude are required');

  try {
    const res = await fetch(`${SOIL_API_BASE}/get_soil_by_coordinates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lon })
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Soil API error: ${res.status} ${res.statusText} ${text}`);
    }
    return await res.json();
  } catch (e) {
    console.warn('Soil backend failed, trying OpenEPI direct...', e.message);
    return await callOpenEpiDirect(lat, lon);
  }
};

export const fetchSoilByLocation = async (location) => {
  if (!location) throw new Error('Location is required');

  // If the user typed coordinates like "lat, lon", prefer coords call
  const coordMatch = String(location).match(/^\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*$/);
  if (coordMatch) {
    const [, latStr, lonStr] = coordMatch;
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    return await fetchSoilByCoords(lat, lon);
  }

  try {
    const res = await fetch(`${SOIL_API_BASE}/get_soil_info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location })
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Soil API error: ${res.status} ${res.statusText} ${text}`);
    }
    return await res.json();
  } catch (e) {
    console.warn('Soil backend (by location) failed:', e.message);
    throw e;
  }
};
