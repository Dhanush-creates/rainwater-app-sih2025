// Browser geolocation helpers and a simple localStorage persistence.

export function requestUserGeolocation(options = {}) {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation API is not available in this environment"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        resolve({ lat: latitude, lon: longitude, accuracy });
      },
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0, ...options }
    );
  });
}

const STORAGE_KEY = "rainwater:userLocation";

export function saveUserLocation(loc) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
    }
  } catch (_) {}
}

export function loadUserLocation() {
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch (_) {}
  return null;
}

