// Lightweight fetch wrapper that works in browser and Node >= 18.
// If running on Node < 18, install `node-fetch` and wire it up here if needed.

function resolveFetch() {
  if (typeof fetch !== "undefined") return fetch.bind(globalThis);
  throw new Error(
    "Global fetch is not available. If running in Node < 18, install node-fetch and import it here."
  );
}

const _fetch = resolveFetch();

export async function httpGet(url, opts = {}) {
  const res = await _fetch(url, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      ...(opts.headers || {}),
    },
    ...opts,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} for ${url} :: ${text}`);
  }
  // Try JSON; fallback to text
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}

export async function httpPostJson(url, body, opts = {}) {
  const res = await _fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...(opts.headers || {}),
    },
    body: JSON.stringify(body),
    ...opts,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} for ${url} :: ${text}`);
  }
  return res.json();
}

