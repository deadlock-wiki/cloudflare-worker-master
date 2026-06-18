const DEFAULT_THEME = "brown";
const DEFAULT_MODE = "dark";
const VALID_MODES = ["light", "dark"];

const TOKEN_PATTERN = /^[a-z0-9-]+$/;

const BFCACHE_SCRIPT = `
      <script>
        window.addEventListener('pageshow', (event) => {
          if (event.persisted) {
            const getCookie = (name) => {
              const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
              return match ? decodeURIComponent(match[2]) : null;
            };
            const theme = getCookie('theme') || '${DEFAULT_THEME}';
            const mode = getCookie('mode') || '${DEFAULT_MODE}';
            document.documentElement.setAttribute('data-theme', theme);
            document.documentElement.setAttribute('data-mode', mode);
          }
        });
      </script>
    `;

function parseCookies(cookieHeader) {
  const out = Object.create(null);

  if (typeof cookieHeader !== "string" || !cookieHeader) {
    return out;
  }

  for (const part of cookieHeader.split(";")) {
    const s = part.trim();
    if (!s) continue;

    const eq = s.indexOf("=");
    if (eq === -1) continue;

    const name = s.slice(0, eq).trim();
    const value = s.slice(eq + 1).trim();

    if (!name) continue;

    const unquoted =
        value.length >= 2 && value.startsWith('"') && value.endsWith('"')
            ? value.slice(1, -1)
            : value;

    out[name] = safeDecodeURIComponent(unquoted);
  }

  return out;
}

function sanitizeToken(value) {
  if (typeof value !== "string") return null;
  if (!value) return null;

  if (!TOKEN_PATTERN.test(value)) return null;

  return value;
}

function safeDecodeURIComponent(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function resolveTheme(rawTheme) {
  return sanitizeToken(rawTheme) || DEFAULT_THEME;
}

function resolveMode(rawMode) {
  const mode = sanitizeToken(rawMode);
  return VALID_MODES.includes(mode) ? mode : DEFAULT_MODE;
}

export function applyThemeRewriter(rewriter, request) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const cookies = parseCookies(cookieHeader);

  const theme = resolveTheme(cookies.theme);
  const mode = resolveMode(cookies.mode);

  rewriter
      .on("html", {
        element(el) {
          el.setAttribute("data-theme", theme);
          el.setAttribute("data-mode", mode);
        },
      })
      .on("head", {
        element(el) {
          el.append(BFCACHE_SCRIPT, { html: true });
        },
      });

  return rewriter;
}