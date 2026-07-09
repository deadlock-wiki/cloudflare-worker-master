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
            const fixedWidth = getCookie('fixedWidth') || '1';
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
          -webkit-mask-image: url('data:image/svg+xml,<svg fill="%23939392" fill-rule="evenodd" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><title> bright </title><path d="M17.07 7.07V2.93h-4.14L10 0 7.07 2.93H2.93v4.14L0 10l2.93 2.93v4.14h4.14L10 20l2.93-2.93h4.14v-4.14L20 10zM10 16a6 6 0 1 1 6-6 6 6 0 0 1-6 6z"/><circle cx="10" cy="10" r="4.5"/></svg>')
          mask-image: url('data:image/svg+xml,<svg fill="%23939392" fill-rule="evenodd" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><title> bright </title><path d="M17.07 7.07V2.93h-4.14L10 0 7.07 2.93H2.93v4.14L0 10l2.93 2.93v4.14h4.14L10 20l2.93-2.93h4.14v-4.14L20 10zM10 16a6 6 0 1 1 6-6 6 6 0 0 1-6 6z"/><circle cx="10" cy="10" r="4.5"/></svg>')
        }
        #pt-theme-toggle a.is-dark {
          -webkit-mask-image: url('data:image/svg+xml,<svg fill="%23939392" fill-rule="evenodd" width="20" height="20" viewBox="0 0 20 20" version="1.1" id="svg1" sodipodi:docname="eclipse.svg" inkscape:export-filename="eclipse1.png" inkscape:export-xdpi="240" inkscape:export-ydpi="240" inkscape:version="1.4.3 (0d15f75042, 2025-12-25)" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns%23" xmlns:cc="http://creativecommons.org/ns%23" xmlns:dc="http://purl.org/dc/elements/1.1/"><defs id="defs1" /><sodipodi:namedview id="namedview1" pagecolor="%23ffffff" bordercolor="%23000000" borderopacity="0.25" inkscape:showpageshadow="2" inkscape:pageopacity="0.0" inkscape:pagecheckerboard="0" inkscape:deskcolor="%23d1d1d1" inkscape:zoom="11.313709" inkscape:cx="1.0606602" inkscape:cy="11.269514" inkscape:window-width="1920" inkscape:window-height="1006" inkscape:window-x="0" inkscape:window-y="0" inkscape:window-maximized="1" inkscape:current-layer="svg1" /><title id="title1"> bright </title><path id="circle1" d="M 10 0 L 7.0703125 2.9296875 L 2.9296875 2.9296875 L 2.9296875 7.0703125 L 0 10 L 2.9296875 12.929688 L 2.9296875 17.070312 L 7.0703125 17.070312 L 10 20 L 12.929688 17.070312 L 17.070312 17.070312 L 17.070312 12.929688 L 20 10 L 19.238281 9.2382812 A 6.25 6.25 0 0 1 15.570312 12.228516 A 6 6 0 0 1 10 16 A 6 6 0 0 1 7.7714844 4.4296875 A 6.25 6.25 0 0 1 10.761719 0.76171875 L 10 0 z M 7.5 6.2578125 A 4.5 4.5 0 0 0 5.5 10 A 4.5 4.5 0 0 0 10 14.5 A 4.5 4.5 0 0 0 13.742188 12.5 A 6.25 6.25 0 0 1 7.5 6.2578125 z " /><metadata id="metadata68"><rdf:RDF><cc:Work rdf:about=""><dc:title> bright </dc:title></cc:Work></rdf:RDF></metadata></svg>')
          mask-image: url('data:image/svg+xml,<svg fill="%23939392" fill-rule="evenodd" width="20" height="20" viewBox="0 0 20 20" version="1.1" id="svg1" sodipodi:docname="eclipse.svg" inkscape:export-filename="eclipse1.png" inkscape:export-xdpi="240" inkscape:export-ydpi="240" inkscape:version="1.4.3 (0d15f75042, 2025-12-25)" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns%23" xmlns:cc="http://creativecommons.org/ns%23" xmlns:dc="http://purl.org/dc/elements/1.1/"><defs id="defs1" /><sodipodi:namedview id="namedview1" pagecolor="%23ffffff" bordercolor="%23000000" borderopacity="0.25" inkscape:showpageshadow="2" inkscape:pageopacity="0.0" inkscape:pagecheckerboard="0" inkscape:deskcolor="%23d1d1d1" inkscape:zoom="11.313709" inkscape:cx="1.0606602" inkscape:cy="11.269514" inkscape:window-width="1920" inkscape:window-height="1006" inkscape:window-x="0" inkscape:window-y="0" inkscape:window-maximized="1" inkscape:current-layer="svg1" /><title id="title1"> bright </title><path id="circle1" d="M 10 0 L 7.0703125 2.9296875 L 2.9296875 2.9296875 L 2.9296875 7.0703125 L 0 10 L 2.9296875 12.929688 L 2.9296875 17.070312 L 7.0703125 17.070312 L 10 20 L 12.929688 17.070312 L 17.070312 17.070312 L 17.070312 12.929688 L 20 10 L 19.238281 9.2382812 A 6.25 6.25 0 0 1 15.570312 12.228516 A 6 6 0 0 1 10 16 A 6 6 0 0 1 7.7714844 4.4296875 A 6.25 6.25 0 0 1 10.761719 0.76171875 L 10 0 z M 7.5 6.2578125 A 4.5 4.5 0 0 0 5.5 10 A 4.5 4.5 0 0 0 10 14.5 A 4.5 4.5 0 0 0 13.742188 12.5 A 6.25 6.25 0 0 1 7.5 6.2578125 z " /><metadata id="metadata68"><rdf:RDF><cc:Work rdf:about=""><dc:title> bright </dc:title></cc:Work></rdf:RDF></metadata></svg>')
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
        
        /* Fixed-width (Constrained state) */
        #pt-fixedwidth-toggle a.is-fixed {
          -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Ctitle%3E fullscreen %3C/title%3E%3Cg fill='%23cbd9f4'%3E%3Cpath d='M1 1v6h2V3h4V1zm2 12H1v6h6v-2H3zm14 4h-4v2h6v-6h-2zm0-16h-4v2h4v4h2V1z'/%3E%3C/g%3E%3C/svg%3E");
          mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Ctitle%3E fullscreen %3C/title%3E%3Cg fill='%23cbd9f4'%3E%3Cpath d='M1 1v6h2V3h4V1zm2 12H1v6h6v-2H3zm14 4h-4v2h6v-6h-2zm0-16h-4v2h4v4h2V1z'/%3E%3C/g%3E%3C/svg%3E");
        }

        /* Fullscreen (Expanded state) */
        #pt-fixedwidth-toggle a.is-fullscreen {
          -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Ctitle%3E exit fullscreen %3C/title%3E%3Cg fill='%23cbd9f4'%3E%3Cpath d='M7 7V1H5v4H1v2zM5 19h2v-6H1v2h4zm10-4h4v-2h-6v6h2zm0-8h4V5h-4V1h-2v6z'/%3E%3C/g%3E%3C/svg%3E");
          mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Ctitle%3E exit fullscreen %3C/title%3E%3Cg fill='%23cbd9f4'%3E%3Cpath d='M7 7V1H5v4H1v2zM5 19h2v-6H1v2h4zm10-4h4v-2h-6v6h2zm0-8h4V5h-4V1h-2v6z'/%3E%3C/g%3E%3C/svg%3E");
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
  const isFixedWidth = cookies.fixedWidth !== "0";
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
