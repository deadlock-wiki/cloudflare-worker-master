// Street Brawl item gate (.sb-gate). The gate body is collapsed to a 100px preview with a
// CSS :target toggle (#sb-items), but its full contents (~260 KB, ~4k DOM nodes, ~170 images
// on hero pages) were always shipped. For anonymous page views we keep only the first tier
// (enough for the preview) and fetch the rest when the reader expands the gate.

export const FULL_CONTENT_HEADER = "X-Wiki-Full-Content";
const FULL_CONTENT_PARAM = "sbfull";

const PLACEHOLDER_HTML =
    `<div class="sb-lazy" data-sb-lazy>` +
    `<a class="sb-lazy-link" href="?${FULL_CONTENT_PARAM}=1#sb-items">Load all items</a>` +
    `</div>`;

const SB_GATE_STYLE = `
<style>
.sb-lazy {
    padding: 1em 0;
    text-align: center;
    color: var(--color-subtle, inherit);
}
.sb-lazy.is-loading::after {
    content: 'Loading items\\2026';
}
.sb-lazy.is-loading .sb-lazy-link {
    display: none;
}
</style>
`;

const SB_GATE_SCRIPT = `
<script>
(function () {
    'use strict';
    var loading = null;
    var htmlPromise = null;

    function fireContentHook(nodes) {
        if (!window.mw || !mw.hook || !window.jQuery) return;
        mw.hook('wikipage.content').fire(jQuery(nodes));
    }

    // Download only (no DOM work), so it can start before the reader expands the gate
    function prefetch() {
        if (!htmlPromise) {
            htmlPromise = fetch(location.pathname + location.search, {
                headers: { '${FULL_CONTENT_HEADER}': '1' },
                credentials: 'same-origin',
                cache: 'no-store'
            }).then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.text();
            });
            htmlPromise.catch(function () {
                htmlPromise = null;
            });
        }
        return htmlPromise;
    }

    function load() {
        if (loading) return loading;
        var placeholders = document.querySelectorAll('[data-sb-lazy]');
        if (!placeholders.length) return Promise.resolve();
        placeholders.forEach(function (p) { p.classList.add('is-loading'); });

        loading = prefetch().then(function (html) {
            var doc = new DOMParser().parseFromString(html, 'text/html');
            var fullBodies = doc.querySelectorAll('.sb-gate-body');
            var bodies = document.querySelectorAll('.sb-gate-body');
            var inserted = [];

            bodies.forEach(function (body, i) {
                var placeholder = body.querySelector('[data-sb-lazy]');
                var full = fullBodies[i];
                if (!placeholder || !full) return;
                // Skip what the page already has (first tier); ignore the fade overlay and any
                // TemplateStyles the worker re-emitted at the end of the body
                var keep = body.querySelectorAll(':scope > :not([data-sb-lazy]):not(.sb-gate-fade):not(style)').length;
                var extra = Array.prototype.filter.call(full.children, function (c) {
                    return !c.classList.contains('sb-gate-fade');
                }).slice(keep);
                var fragment = document.createDocumentFragment();
                extra.forEach(function (node) {
                    var imported = document.importNode(node, true);
                    fragment.appendChild(imported);
                    inserted.push(imported);
                });
                placeholder.replaceWith(fragment);
            });

            fireContentHook(inserted);
        }).catch(function () {
            loading = null;
            document.querySelectorAll('[data-sb-lazy]').forEach(function (p) {
                p.classList.remove('is-loading');
            });
        });
        return loading;
    }

    // Expanding the gate: the "Show all items" link sets #sb-items
    document.addEventListener('click', function (e) {
        var link = e.target.closest && e.target.closest('.sb-gate-btn a, .sb-lazy-link');
        if (!link) return;
        if (link.classList.contains('sb-lazy-link')) e.preventDefault();
        load();
    });
    // Start downloading when the gate comes near the viewport or the pointer reaches it
    if ('IntersectionObserver' in window) {
        var observer = new IntersectionObserver(function (entries) {
            if (entries.some(function (e) { return e.isIntersecting; })) {
                observer.disconnect();
                prefetch();
            }
        }, { rootMargin: '600px 0px' });
        document.querySelectorAll('.sb-gate').forEach(function (g) { observer.observe(g); });
    }
    document.addEventListener('pointerover', function (e) {
        if (e.target.closest && e.target.closest('.sb-gate-btn')) prefetch();
    });
    window.addEventListener('hashchange', function () {
        if (location.hash === '#sb-items') load();
    });
    if (location.hash === '#sb-items') load();
})();
</script>
`;

/** Whether this request should get the trimmed gate. */
export function shouldTrimSbGate(request, url) {
    if (request.headers.get(FULL_CONTENT_HEADER) === "1") return false;
    if (url.searchParams.get(FULL_CONTENT_PARAM) === "1") return false;
    if (url.searchParams.get("printable") === "yes") return false;
    return true;
}

export function applySbGateRewriter(rewriter) {
    let childIndex = 0;
    let removing = false;
    let trimmed = false;
    // TemplateStyles are emitted once per page (<style data-mw-deduplicate>) and later uses only
    // link to them. Styles found inside removed tiers are re-emitted so content further down the
    // page that links to them keeps its styling.
    let keptStyles = [];
    let currentStyle = null;

    rewriter
        .on(".sb-gate-body", {
            element(el) {
                childIndex = 0;
                keptStyles = [];
                el.onEndTag((end) => {
                    if (keptStyles.length) {
                        end.before(keptStyles.map(renderStyle).join(""), { html: true });
                    }
                });
            },
        })
        .on(".sb-gate-body > *", {
            element(el) {
                childIndex++;
                if (childIndex === 1) return; // first tier: shown in the collapsed preview
                if ((el.getAttribute("class") || "").split(/\s+/).includes("sb-gate-fade")) return;

                if (childIndex === 2) {
                    el.before(PLACEHOLDER_HTML, { html: true });
                    trimmed = true;
                }
                removing = true;
                el.onEndTag(() => {
                    removing = false;
                });
                el.remove();
            },
        })
        .on(".sb-gate-body style[data-mw-deduplicate]", {
            element(el) {
                if (!removing) return;
                currentStyle = { key: el.getAttribute("data-mw-deduplicate"), css: "" };
                keptStyles.push(currentStyle);
                el.onEndTag(() => {
                    currentStyle = null;
                });
            },
            text(chunk) {
                if (currentStyle) currentStyle.css += chunk.text;
            },
        })
        .on("body", {
            element(el) {
                el.onEndTag((end) => {
                    if (trimmed) end.before(SB_GATE_STYLE + SB_GATE_SCRIPT, { html: true });
                });
            },
        });

    return rewriter;
}

function renderStyle({ key, css }) {
    const safeKey = String(key).replace(/[^A-Za-z0-9:_.-]/g, "");
    // Original style text from the origin; only guard against closing the element early
    return `<style data-mw-deduplicate="${safeKey}">${css.replace(/<\/style/gi, "<\\/style")}</style>`;
}
