import { httpPostJson } from "./http.js";
import { GEMINI_API_KEY as KEY_FROM_FILE, GEMINI_MODEL as MODEL_FROM_FILE } from "./config.js";

function getGeminiKey() {
  const viteKey = (typeof import !== "undefined" && typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) || null;
  if (viteKey) return viteKey;
  const nodeKey = (typeof process !== "undefined" && process.env && process.env.GEMINI_API_KEY) || null;
  if (nodeKey) return nodeKey;
  return KEY_FROM_FILE || null;
}

function getGeminiModel() {
  const viteModel = (typeof import !== "undefined" && typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_GEMINI_MODEL) || null;
  if (viteModel) return viteModel;
  const nodeModel = (typeof process !== "undefined" && process.env && process.env.GEMINI_MODEL) || null;
  if (nodeModel) return nodeModel;
  return MODEL_FROM_FILE || "gemini-1.5-flash";
}

// Compose a structured prompt for Gemini to decide RWH feasibility.
function buildPrompt({ location, rainfall, groundwater, notes }) {
  const lines = [];
  lines.push("You are an expert hydrologist and civil engineer.");
  lines.push(
    "Evaluate feasibility of installing rainwater harvesting (RWH) for the given location using rainfall and groundwater trends."
  );
  lines.push("Return a concise JSON with fields: recommendation (yes|no|maybe), confidence (0-1), reasons (array of strings), considerations (array of strings).");

  if (location) {
    lines.push(`Location: ${JSON.stringify(location)}`);
  }
  if (rainfall) {
    lines.push(`Rainfall data: ${JSON.stringify(rainfall)}`);
  }
  if (groundwater) {
    lines.push(`Groundwater data: ${JSON.stringify(groundwater).slice(0, 6000)}`); // cap size for safety
  }
  if (notes) {
    lines.push(`Notes: ${notes}`);
  }
  lines.push("Important: Respond with ONLY the JSON object, no extra text.");
  return lines.join("\n");
}

export async function assessRWHFeasibility({ location, rainfall, groundwater, notes }) {
  const apiKey = getGeminiKey();
  if (!apiKey) throw new Error("Missing Gemini API key");
  const model = getGeminiModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const prompt = buildPrompt({ location, rainfall, groundwater, notes });

  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 512,
    },
  };

  const data = await httpPostJson(url, body);
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  // Try to parse JSON from the model response
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch (_) {
    // Attempt to extract JSON substring if any
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch (_) {}
    }
  }
  return { raw: data, text, result: parsed };
}

