export default {
  async fetch(request, env, ctx) {
    const response = await fetch(request);

    // Only rewrite HTML responses
    const contentType = response.headers.get("Content-Type") || "";
    if (!contentType.toLowerCase().includes("text/html")) {
      return response;
    }

    const cookieHeader = request.headers.get("Cookie") || "";
    const cookies = parseCookies(cookieHeader);

    // Theme defaults to brown if cookie is missing or invalid
    const theme = sanitizeToken(cookies.theme) || "brown";

    // Mode defaults to dark if cookie is missing or invalid
    const modeRaw = sanitizeToken(cookies.mode);
    const mode =
      modeRaw === "light" || modeRaw === "dark"
        ? modeRaw
        : "dark";

    const rewriter = new HTMLRewriter().on("html", {
      element(el) {
        el.setAttribute("data-theme", theme);
        el.setAttribute("data-mode", mode);
      },
    });

    const transformed = rewriter.transform(response);

    // Protect personalized HTML from shared caches
    transformed.headers.set("Cache-Control", "private, no-cache");

    return transformed;
  },
};

// Parses a Cookie header into an object: { [name]: value }
function parseCookies(cookieHeader) {
  const out = Object.create(null);

  // Split on ;, trim whitespace, keep first '=' as delimiter
  for (const part of cookieHeader.split(";")) {
    const s = part.trim();
    if (!s) continue;

    const eq = s.indexOf("=");
    if (eq === -1) continue;

    const name = s.slice(0, eq).trim();
    const value = s.slice(eq + 1).trim();

    if (!name) continue;

    // Cookie values may be quoted; strip a single pair of surrounding quotes
    const unquoted =
      value.length >= 2 &&
      value.startsWith('"') &&
      value.endsWith('"')
        ? value.slice(1, -1)
        : value;

    // Decode percent-encoding safely (optional but common)
    out[name] = safeDecodeURIComponent(unquoted);
  }

  return out;
}

// Allow only lowercase letters, digits, hyphen. Otherwise discard.
function sanitizeToken(value) {
  if (typeof value !== "string") return null;
  if (!value) return null;

  // Enforce the allowed charset exactly
  if (!/^[a-z0-9-]+$/.test(value)) return null;

  return value;
}

function safeDecodeURIComponent(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
