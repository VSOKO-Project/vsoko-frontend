// Read the existing name claim for display only. Authorization still uses the API session.
export function accountLogin(token: string, fallback = ""): string {
  try {
    const payload = token.split(".")[1];
    if (!payload) return fallback;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(
      atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")),
      (c) => c.charCodeAt(0),
    );
    const claims = JSON.parse(new TextDecoder().decode(bytes));
    for (const key of [
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
      "unique_name",
      "preferred_username",
      "name",
    ]) {
      if (typeof claims[key] === "string" && claims[key].trim())
        return claims[key].trim();
    }
  } catch {
    /* Older or damaged sessions use the recorded login. */
  }
  return fallback;
}
