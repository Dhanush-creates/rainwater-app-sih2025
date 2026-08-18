// Vercel Serverless Function — AccuWeather Proxy
// Keeps ACCUWEATHER_API_KEY secret on the server side.

export default async function handler(req, res) {
  // CORS headers so the browser React app can call this
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const API_KEY = process.env.ACCUWEATHER_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: 'AccuWeather API key not configured on server.' });
  }

  const BASE = 'https://dataservice.accuweather.com';
  const { action, lat, lon, locationKey } = req.query;

  try {
    if (action === 'geoposition' || (!action && lat && lon)) {
      // Resolve location key from lat/lon
      const url = `${BASE}/locations/v1/cities/geoposition/search?apikey=${encodeURIComponent(API_KEY)}&q=${encodeURIComponent(`${lat},${lon}`)}`;
      const upstream = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!upstream.ok) {
        const txt = await upstream.text();
        return res.status(upstream.status).json({ error: `AccuWeather error: ${upstream.status}`, details: txt });
      }
      const data = await upstream.json();
      return res.status(200).json(data);
    }

    if (action === 'historical24' && locationKey) {
      // 24h rainfall history
      const url = `${BASE}/currentconditions/v1/${encodeURIComponent(locationKey)}/historical/24?apikey=${encodeURIComponent(API_KEY)}`;
      const upstream = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!upstream.ok) {
        const txt = await upstream.text();
        return res.status(upstream.status).json({ error: `AccuWeather error: ${upstream.status}`, details: txt });
      }
      const data = await upstream.json();
      return res.status(200).json(data);
    }

    return res.status(400).json({
      error: 'Invalid action. Use ?action=geoposition&lat=...&lon=... or ?action=historical24&locationKey=...',
    });
  } catch (err) {
    console.error('AccuWeather proxy error:', err);
    return res.status(500).json({ error: 'Internal proxy error', details: err.message });
  }
}
