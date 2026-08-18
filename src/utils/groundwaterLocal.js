// Client for local FastAPI groundwater service (Excel-based)

const GW_API_BASE = import.meta.env.VITE_GW_API_BASE || '';

export const fetchLocalGroundwaterByCoords = async (lat, lon) => {
  if (lat == null || lon == null) throw new Error('Latitude and longitude are required');
  const candidates = [
    // Prefer Flask proxy (same origin CORS and consistent shape)
    `${(import.meta.env.VITE_SOIL_API_BASE || 'http://localhost:5000').replace(/\/$/, '')}/get_groundwater_by_coordinates`,
    GW_API_BASE ? `${GW_API_BASE.replace(/\/$/, '')}/groundwater?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}` : null,
    `http://127.0.0.1:8000/groundwater?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`,
    `http://localhost:8000/groundwater?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`,
  ].filter(Boolean);

  let lastError = null;
  let data = null;
  let finalUrl = null;
  for (const url of candidates) {
    try {
      const isPost = url.includes('/get_groundwater_by_coordinates');
      const res = await fetch(url, {
        method: isPost ? 'POST' : 'GET',
        headers: isPost ? { 'Content-Type': 'application/json' } : undefined,
        body: isPost ? JSON.stringify({ lat, lon }) : undefined
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`${res.status} ${res.statusText} ${text}`);
      }
      data = await res.json();
      finalUrl = url;
      break;
    } catch (e) {
      lastError = e;
      continue;
    }
  }
  if (!data) {
    throw new Error(`Failed to fetch from local groundwater API. ${lastError ? lastError.message : ''}`);
  }

  // Check if data is already normalized (from Flask proxy) or needs normalization (from FastAPI)
  if (data?.values && data?.stationInfo) {
    // Data is already normalized from Flask proxy
    return data;
  } else {
    // Data needs normalization from FastAPI
    const wl = data?.nearest_record_data?.["WL (in mbgl)"];
    return {
      values: [{ value: [{ value: wl != null ? String(wl) : 'N/A' }] }],
      variable: { unit: { unitCode: 'm bgl' } },
      stationInfo: {
        stationName: [
          data?.nearest_record_data?.VILLAGE,
          data?.nearest_record_data?.BLOCK,
          data?.nearest_record_data?.DISTRICT,
          data?.nearest_record_data?.STATE_UT
        ].filter(Boolean).join(', '),
        stateName: data?.nearest_record_data?.STATE_UT,
        districtName: data?.nearest_record_data?.DISTRICT,
        agencyName: 'Local Excel Dataset',
        lastUpdated: data?.nearest_record_data?.Date || 'N/A'
      },
      rawData: data,
      isMockData: false,
      apiResponse: { endpoint: finalUrl, status: 200 }
    };
  }
};


