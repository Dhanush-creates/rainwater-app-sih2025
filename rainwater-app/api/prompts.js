// Minimal browser prompts to gather WRIS parameters from the user.

export async function promptWrisCodes() {
  if (typeof window === "undefined" || typeof window.prompt === "undefined") {
    throw new Error("prompt() not available in this environment; collect inputs via your UI");
  }
  const stateCodeStr = window.prompt("Enter India stateCode (e.g., 28):");
  const districtCodeStr = window.prompt("Enter districtCode (e.g., 517):");
  const stateCode = stateCodeStr ? Number(stateCodeStr.trim()) : null;
  const districtCode = districtCodeStr ? Number(districtCodeStr.trim()) : null;
  if (!stateCode || !districtCode || Number.isNaN(stateCode) || Number.isNaN(districtCode)) {
    throw new Error("Invalid WRIS codes entered");
  }
  return { stateCode, districtCode };
}

