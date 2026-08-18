// Vercel Serverless Function — India WRIS Groundwater Proxy
// Handles CORS issues with indiawris.gov.in and returns clean JSON.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { stateCode, districtCode, stateName, districtName } = req.query;

  // Build the WRIS API URL
  let url;
  if (stateName && districtName) {
    // Name-based query
    url = `https://indiawris.gov.in/Dataset/Ground Water Level?stateName=${encodeURIComponent(stateName)}&districtName=${encodeURIComponent(districtName)}&agencyName=cgwb&download=false&page=0&size=20`;
  } else if (stateCode && districtCode) {
    // Code-based query
    url = `https://indiawris.gov.in/api/groundWaterLevel?stateCode=${encodeURIComponent(stateCode)}&districtCode=${encodeURIComponent(districtCode)}`;
  } else {
    return res.status(400).json({
      error: 'Provide either (stateName & districtName) or (stateCode & districtCode)',
    });
  }

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; RainwaterApp/1.0)',
        'Referer': 'https://indiawris.gov.in/',
        'Origin': 'https://indiawris.gov.in',
      },
      body: '',
    });

    const contentType = upstream.headers.get('content-type') || '';
    const text = await upstream.text();

    // WRIS sometimes returns HTML when there's an error — detect and handle gracefully
    const isHtml = text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html');
    if (isHtml) {
      console.warn('WRIS returned HTML instead of JSON. Status:', upstream.status);
      return res.status(502).json({
        error: 'India WRIS API returned an HTML response (service may be down or endpoint changed).',
        wrisStatus: upstream.status,
        note: 'The app will continue with estimated groundwater data.',
      });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({
        error: 'Failed to parse WRIS response as JSON',
        raw: text.substring(0, 500),
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('WRIS proxy error:', err);
    return res.status(500).json({
      error: 'Failed to reach India WRIS API',
      details: err.message,
      note: 'The app will continue with estimated groundwater data.',
    });
  }
}
