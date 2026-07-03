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

const CRITICAL_CSS = `
      <style>
        /* Shared alignment styles to keep your menu neat and consistent */
        #pt-theme-toggle, #pt-fixedwidth-toggle {
          display: inline-block;
          vertical-align: middle;
        }

        /* Theme Toggle Styling */
        #pt-theme-toggle a {
          width: 16px;
          height: 16px;
          display: block;
          opacity: 0.6;
          background-color: var(--color-base);
          -webkit-mask-size: contain;
          mask-size: contain;
          -webkit-mask-repeat: no-repeat;
          mask-repeat: no-repeat;
          -webkit-mask-position: center;
          mask-position: center;
        }
        #pt-theme-toggle a:hover {
          opacity: 1;
        }
        #pt-theme-toggle a.is-light {
          -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='black' stroke-width='1.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z'/%3E%3C/svg%3E");
          mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='black' stroke-width='1.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z'/%3E%3C/svg%3E");
        }
        #pt-theme-toggle a.is-dark {
          -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='black' stroke-width='1.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z'/%3E%3C/svg%3E");
          mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='black' stroke-width='1.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z'/%3E%3C/svg%3E");
        }

        /* Fixed-Width Toggle Base Layout */
        #pt-fixedwidth-toggle a {
          width: 14px;
          height: 14px;
          display: block;
          opacity: 0.6;
          background: var(--color-base);
          -webkit-mask-clip: inherit;
          mask-clip: inherit;
          -webkit-mask-size: contain;
          mask-size: contain;
          -webkit-mask-repeat: no-repeat;
          mask-repeat: no-repeat;
          -webkit-mask-position: center;
          mask-position: center;
        }
        #pt-fixedwidth-toggle a:hover {
          opacity: 1;
        }
        
        # Fixed-width
        #pt-fixedwidth-toggle a.is-fixed {
          -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Ctitle%3E exit fullscreen %3C/title%3E%3Cg fill='%23cbd9f4'%3E%3Cpath d='M7 7V1H5v4H1v2zM5 19h2v-6H1v2h4zm10-4h4v-2h-6v6h2zm0-8h4V5h-4V1h-2v6z'/%3E%3C/g%3E%3C/svg%3E");
          mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Ctitle%3E exit fullscreen %3C/title%3E%3Cg fill='%23cbd9f4'%3E%3Cpath d='M7 7V1H5v4H1v2zM5 19h2v-6H1v2h4zm10-4h4v-2h-6v6h2zm0-8h4V5h-4V1h-2v6z'/%3E%3C/g%3E%3C/svg%3E");
        }

        # Fullscreen
        #pt-fixedwidth-toggle a.is-fullscreen {
          -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Ctitle%3E fullscreen %3C/title%3E%3Cg fill='%23cbd9f4'%3E%3Cpath d='M1 1v6h2V3h4V1zm2 12H1v6h6v-2H3zm14 4h-4v2h6v-6h-2zm0-16h-4v2h4v4h2V1z'/%3E%3C/g%3E%3C/svg%3E");
          mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Ctitle%3E fullscreen %3C/title%3E%3Cg fill='%23cbd9f4'%3E%3Cpath d='M1 1v6h2V3h4V1zm2 12H1v6h6v-2H3zm14 4h-4v2h6v-6h-2zm0-16h-4v2h4v4h2V1z'/%3E%3C/g%3E%3C/svg%3E");
        }
      </style>
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

  // Read fixedWidth layout rule from cookies
  const isFixedWidth = cookies.fixedWidth === "1";
  const fixedWidthValue = isFixedWidth ? "min(1450px, 90vw)" : "100vw";

  // Pre-calculate theme classes and titles to match gadget definitions
  const themeClass = mode === "light" ? "is-light" : "is-dark";
  const themeLabel = mode === "light" ? "Switch to dark theme" : "Switch to light theme";

  // Pre-calculate fixed-width classes and access labels to match vector schemas
  const fixedWidthClass = isFixedWidth ? "is-fixed" : "is-fullscreen";
  const fixedWidthLabel = isFixedWidth ? "Switch to fullscreen layout" : "Switch to fixed width layout";

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
          el.append(BFCACHE_SCRIPT + CRITICAL_CSS, { html: true });
        },
      })
      .on("#p-personal ul", {
        element(el) {
          const themeToggleHtml = `<li id="pt-theme-toggle"><a href="#" class="${themeClass}" aria-label="${themeLabel}" title="${themeLabel}"></a></li>`;
          const fixedWidthToggleHtml = `<li id="pt-fixedwidth-toggle"><a href="#" class="${fixedWidthClass}" aria-label="${fixedWidthLabel}" title="${fixedWidthLabel}"></a></li>`;
          
          el.prepend(themeToggleHtml + fixedWidthToggleHtml, { html: true });
        }
      });

  return rewriter;
}