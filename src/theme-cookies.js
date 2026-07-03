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
            
            // Sync layout changes on history traversal
            const fixedWidth = getCookie('fixedWidth') || '0';
            document.documentElement.style.setProperty('--fixed-width', fixedWidth === '1' ? 'min(1450px, 90vw)' : '100vw');
          }
        });
      </script>
    `;

function parseCookies(cookieHeader) {
  const out = Object.create(null);
  if (typeof cookieHeader !== "string" || !cookieHeader) return out;

  for (const part of cookieHeader.split(";")) {
    const s = part.trim();
    if (!s) continue;
    const eq = s.indexOf("=");
    if (eq === -1) continue;
    const name = s.slice(0, eq).trim();
    const value = s.slice(eq + 1).trim();
    if (!name) continue;

    const unquoted = value.length >= 2 && value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1) : value;
    out[name] = safeDecodeURIComponent(unquoted);
  }
  return out;
}

function sanitizeToken(value) {
  if (typeof value !== "string" || !value || !TOKEN_PATTERN.test(value)) return null;
  return value;
}

function safeDecodeURIComponent(s) {
  try { return decodeURIComponent(s); } catch { return s; }
}

function resolveTheme(rawTheme) { return sanitizeToken(rawTheme) || DEFAULT_THEME; }
function resolveMode(rawMode) {
  const mode = sanitizeToken(rawMode);
  return VALID_MODES.includes(mode) ? mode : DEFAULT_MODE;
}

export function applyThemeRewriter(rewriter, request) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const cookies = parseCookies(cookieHeader);

  const theme = resolveTheme(cookies.theme);
  const mode = resolveMode(cookies.mode);

  // Read fixedWidth layout layout rule from cookies
  const isFixedWidth = cookies.fixedWidth === "1";
  const fixedWidthValue = isFixedWidth ? "min(1450px, 90vw)" : "100vw";

  // Pre-calculate theme classes and titles to match gadget definitions
  const themeClass = mode === "light" ? "is-light" : "is-dark";
  const themeLabel = mode === "light" ? "Switch to dark theme" : "Switch to light theme";

  rewriter
      .on("html", {
        element(el) {
          el.setAttribute("data-theme", theme);
          el.setAttribute("data-mode", mode);

          // Append layout styling directly onto the root HTML element server-side
          const existingStyle = el.getAttribute("style") || "";
          el.setAttribute("style", `${existingStyle}; --fixed-width: ${fixedWidthValue};`.trim());
        },
      })
      .on("head", {
        element(el) {
          el.append(BFCACHE_SCRIPT, { html: true });
        },
      })
      // Prepend both toggles seamlessly into the personal bar stream
      .on("#p-personal ul", {
        element(el) {
          const themeToggleHtml = `<li id="pt-theme-toggle"><a href="#" class="${themeClass}" aria-label="${themeLabel}" title="${themeLabel}"></a></li>`;
          const fixedWidthToggleHtml = `<li id="pt-fixedwidth-toggle"><a href="#" aria-label="Toggle fixed width">Toggle Width</a></li>`;
          
          el.prepend(themeToggleHtml + fixedWidthToggleHtml, { html: true });
        }
      });

  return rewriter;
}