// NASA POWER API helper to compute annual rainfall (meters/year)
// Uses monthly climatology of PRECTOTCORR (precipitation, corrected) in mm/day
// API Docs: https://power.larc.nasa.gov/

export async function fetchAnnualRainfallMeters(lat, lon) {
  if (lat == null || lon == null) throw new Error('Latitude/Longitude required');
  const endpoint = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=PRECTOTCORR&community=AG&latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&format=JSON`;
  const res = await fetch(endpoint, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`NASA POWER failed: ${res.status}`);
  const data = await res.json();
  // Expected structure: data.properties.parameter.PRECTOTCORR = { JAN: mm/day, FEB: mm/day, ... }
  const monthly = data?.properties?.parameter?.PRECTOTCORR;
  if (!monthly) throw new Error('PRECTOTCORR missing');
  const daysPerMonth = { JAN:31, FEB:28, MAR:31, APR:30, MAY:31, JUN:30, JUL:31, AUG:31, SEP:30, OCT:31, NOV:30, DEC:31 };
  let mmPerYear = 0;
  for (const [mon, mmPerDay] of Object.entries(monthly)) {
    const d = daysPerMonth[mon] || 30;
    const v = Number(mmPerDay) || 0;
    mmPerYear += v * d;
  }
  // Convert mm/year to meters/year
  const metersPerYear = mmPerYear / 1000;
  return {
    metersPerYear,
    mmPerYear,
    monthlyMmPerDay: monthly,
    source: 'NASA POWER PRECTOTCORR (climatology)'
  };
}

// Typical runoff coefficients reference
export const RUNOFF_COEFFICIENTS = [
  { key: 'concrete', label: 'Concrete roof', value: 0.8 },
  { key: 'tiled', label: 'Tiled roof', value: 0.6 },
  { key: 'unpaved_low', label: 'Unpaved (low)', value: 0.3 },
  { key: 'unpaved_mid', label: 'Unpaved (mid)', value: 0.4 },
  { key: 'unpaved_high', label: 'Unpaved (high)', value: 0.5 },
];
