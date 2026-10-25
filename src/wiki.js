import { getRecentChangesHTML } from "./recent-changes.js";
import { applyThemeRewriter } from "./theme-cookies.js";

// Paths that are never wiki page views. Static assets keep the origin's own caching headers.
const NON_PAGE_PREFIXES = [
    "/api/",
    "/images/",
    "/resources/",
    "/extensions/",
    "/skins/",
    "/vendor/",
    "/cdn-cgi/",
];
const PHP_ENTRYPOINT = /\.php$/i;

// MediaWiki session cookies are "<prefix>_session", "<prefix>UserID", "<prefix>UserName",
// "<prefix>Token" and "<prefix>LoggedOut". Match on cookie NAMES only, not values.
const BYPASS_COOKIE_SUFFIXES = ["_session", "userid", "username", "token", "loggedout"];

const EDGE_CACHE_TTL_BY_STATUS = {
    "200-299": 300,
    "404": 10,
    "500-599": -1,
};

function safeDecode(value) {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

function getCookieNames(cookieHeader) {
    const names = [];
    for (const part of cookieHeader.split(";")) {
        const eq = part.indexOf("=");
        const name = (eq === -1 ? part : part.slice(0, eq)).trim();
        if (name) names.push(name);
    }
    return names;
}

function hasSessionCookie(request) {
    const cookieHeader = request.headers.get("Cookie") || "";
    if (!cookieHeader) return false;
    return getCookieNames(cookieHeader).some((name) => {
        const lower = name.toLowerCase();
        return BYPASS_COOKIE_SUFFIXES.some((suffix) => lower.endsWith(suffix));
    });
}

// Returns the page title a request points at, or null if it is not a page view.
function getPageTitle(url) {
    const pathname = url.pathname;
    if (NON_PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null;

    if (pathname === "/index.php") {
        const title = url.searchParams.get("title");
        if (title) return safeDecode(title);
        // Only default to Main_Page when there are no other query parameters (e.g. not ?curid= or ?diff=)
        return url.search === "" ? "Main_Page" : null;
    }
    if (PHP_ENTRYPOINT.test(pathname)) return null;
    if (pathname === "/") return "Main_Page";

    return safeDecode(pathname.slice(1));
}

function isSpecialTitle(title) {
    return title.replace(/^\s+/, "").toLowerCase().startsWith("special:");
}

function hasOnlyViewParams(url) {
    if (url.search === "") return true;
    for (const [key, value] of url.searchParams) {
        if (key === "title" && url.pathname === "/index.php") continue;
        if (key === "action" && value === "view") continue;
        return false;
    }
    return true;
}

function isCacheableRequest(request, url) {
    if (request.method !== "GET" && request.method !== "HEAD") return false;
    if (request.headers.has("Authorization")) return false;

    const title = getPageTitle(url);
    if (title === null || isSpecialTitle(title)) return false;

    // Only plain page views (no ?diff=, ?oldid=, ?veaction=, ?redirect=no, etc.)
    if (!hasOnlyViewParams(url)) return false;

    // Logged-in users and anonymous users with a session (e.g. after an anon edit)
    if (hasSessionCookie(request)) return false;

    return true;
}

function getCacheTags(url) {
    const tags = ["wiki-page"];
    const title = getPageTitle(url);
    if (title) {
        const tag = "page:" + encodeURIComponent(title.replace(/ /g, "_"));
        if (tag.length <= 1024) tags.push(tag);
    }
    return tags;
}

function widgetResponse(html) {
    return new Response(`<ul class="vector-menu-content-list recent-changes-list">${html}</ul>`, {
        status: 200,
        headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "public, max-age=60",
        },
    });
}

export async function handleWikiRequest(request, env, ctx) {
    const url = new URL(request.url);

    // API ROUTE
    if (request.method === "GET" && url.pathname === "/api/recent-changes") {
        try {
            const html = await getRecentChangesHTML(env, ctx);
            if (html) return widgetResponse(html);
        } catch (err) {
            console.error("recent-changes route failed:", err);
        }
        return new Response("Unable to build recent changes widget", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
        });
    }

    const isPageRequest = getPageTitle(url) !== null;
    const shouldCache = isCacheableRequest(request, url);

    // Fetch origin:
    // - Eligible anonymous page views: cache at the Cloudflare edge for 300s.
    // - Non-cacheable page/script requests (logged-in users, Special:, ?diff=, ?action=edit, api.php):
    //   force cacheEverything: false and cacheTtl: -1 so an existing anonymous edge cache entry
    //   (or MediaWiki's s-maxage=18000 header) never serves a logged-out cached page to a logged-in user.
    // - Static assets (/images/, /resources/, /skins/, /extensions/): leave default cf behavior so
    //   Cloudflare respects MediaWiki's static asset cache headers.
    const fetchOptions = shouldCache
        ? {
              cf: {
                  cacheEverything: true,
                  cacheTtlByStatus: EDGE_CACHE_TTL_BY_STATUS,
                  cacheTags: getCacheTags(url),
              },
          }
        : isPageRequest || PHP_ENTRYPOINT.test(url.pathname)
          ? {
                cf: {
                    cacheEverything: false,
                    cacheTtl: -1,
                },
            }
          : {};

    // Start the widget lookup in parallel with the origin fetch; it is only awaited if the
    // response turns out to be HTML. Skipped for asset/entrypoint requests.
    const widgetPromise = isPageRequest
        ? getRecentChangesHTML(env, ctx).catch((err) => {
              console.error("recent-changes widget failed:", err);
              return null;
          })
        : Promise.resolve(null);

    let originResponse;
    try {
        originResponse = await fetch(request, fetchOptions);
    } catch (err) {
        // Do not retry: the request body may already be consumed (POST edits).
        console.error("origin fetch failed:", err);
        return new Response("Origin unreachable", {
            status: 502,
            headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
        });
    }

    const contentType = originResponse.headers.get("Content-Type") || "";
    if (!contentType.toLowerCase().includes("text/html")) {
        return originResponse;
    }

    let widgetHtml = null;
    try {
        widgetHtml = await widgetPromise;
    } catch {
        widgetHtml = null;
    }

    const rewriter = new HTMLRewriter();

    try {
        applyThemeRewriter(rewriter, request);
    } catch (err) {
        console.error("theme rewriter failed:", err);
    }

    if (widgetHtml) {
        rewriter.on("#p-Recent_changes ul.vector-menu-content-list", {
            element(el) {
                el.setAttribute("class", "vector-menu-content-list recent-changes-list");
                el.setInnerContent(widgetHtml, { html: true });
            },
        });
    }

    const transformedResponse = rewriter.transform(originResponse);

    // The HTML is personalised per request (theme cookies) and differs between logged-in and
    // anonymous users, so browsers and shared proxies must not reuse it. The edge copy of the
    // origin response is controlled separately by cf.cacheTtlByStatus above.
    const responseHeaders = new Headers(transformedResponse.headers);
    responseHeaders.set("Cache-Control", "private, no-cache");
    responseHeaders.append("Vary", "Cookie");

    return new Response(transformedResponse.body, {
        status: transformedResponse.status,
        statusText: transformedResponse.statusText,
        headers: responseHeaders,
    });
}
