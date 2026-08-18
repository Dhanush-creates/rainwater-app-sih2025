// Vercel Serverless Function — Gemini AI Proxy
// Keeps GEMINI_API_KEY secret on the server side.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  const API_KEY = process.env.GEMINI_API_KEY;
  const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  if (!API_KEY) {
    return res.status(500).json({ error: 'Gemini API key not configured on server.' });
  }

  const { location, rainfall, groundwater, notes } = req.body || {};

  // Build prompt
  const lines = [
    'You are an expert hydrologist and civil engineer.',
    'Evaluate feasibility of installing rainwater harvesting (RWH) for the given location using rainfall and groundwater trends.',
    'Return a concise JSON with fields: recommendation (yes|no|maybe), confidence (0-1), reasons (array of strings), considerations (array of strings).',
  ];
  if (location) lines.push(`Location: ${JSON.stringify(location)}`);
  if (rainfall) lines.push(`Rainfall data: ${JSON.stringify(rainfall)}`);
  if (groundwater) lines.push(`Groundwater data: ${JSON.stringify(groundwater).slice(0, 6000)}`);
  if (notes) lines.push(`Notes: ${notes}`);
  lines.push('Important: Respond with ONLY the JSON object, no extra text.');
  const prompt = lines.join('\n');

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
  };

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent?key=${encodeURIComponent(API_KEY)}`;
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!upstream.ok) {
      const txt = await upstream.text();
      return res.status(upstream.status).json({ error: `Gemini API error: ${upstream.status}`, details: txt });
    }

    const data = await upstream.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('Gemini proxy error:', err);
    return res.status(500).json({ error: 'Internal proxy error', details: err.message });
  }
}
