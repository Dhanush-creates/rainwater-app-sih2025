// Gemini AI API — routes through our secure Vercel serverless function.
// The API key stays server-side; the browser only calls /api/gemini.

export async function assessRWHFeasibility({ location, rainfall, groundwater, notes }) {
  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ location, rainfall, groundwater, notes }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(`Gemini proxy error: ${res.status} — ${err.error || err.details}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  // Try to parse JSON from the model response
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch {}
    }
  }
  return { raw: data, text, result: parsed };
}
