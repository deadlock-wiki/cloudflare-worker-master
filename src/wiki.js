import { getRecentChangesHTML } from "./recent-changes.js";
import { applyThemeRewriter } from "./theme-cookies.js";
import { applyFeedbackRewriter } from "./feedback.js";

export async function handleWikiRequest(request, env) {
    try {
        const url = new URL(request.url);
        const cookieHeader = request.headers.get("Cookie") || "";

        // API ROUTE
        if (request.method === "GET" && url.pathname === "/api/recent-changes") {
            try {
                const html = await getRecentChangesHTML(env);

                if (!html) {
                    return new Response("Unable to build recent changes widget", {
                        status: 500,
                        headers: { "Content-Type": "text/plain; charset=utf-8" },
                    });
                }

                return new Response(
                    `<ul class="vector-menu-content-list recent-changes-list">${html}</ul>`,
                    {
                        status: 200,
                        headers: {
                            "Content-Type": "text/html; charset=utf-8",
                            "Cache-Control": "no-store",
                        },
                    }
                );
            } catch {
                return new Response("Widget error", {
                    status: 500,
                    headers: { "Content-Type": "text/plain; charset=utf-8" },
                });
            }
        }

        // 1. Robust login detection (prefix-agnostic core suffixes)
        const isLoggedIn = cookieHeader.includes("UserID=") || 
                           cookieHeader.includes("_session=") || 
                           cookieHeader.includes("Token=");
        const isLoggedOut = !isLoggedIn;

        // 2. Strict Guardrails: Identify administrative and system routes
        const isGet = request.method === "GET";
        const isPhpScript = url.pathname.includes(".php");
        const isSpecialPage = url.pathname.includes("/Special:") || 
                              (url.searchParams.has("title") && url.searchParams.get("title").includes("Special:"));
        
        const hasAdminAction = url.searchParams.has("action") && url.searchParams.get("action") !== "view";
        const hasMobileToggle = url.searchParams.has("mobileaction");
        const hasExplicitFormat = url.searchParams.has("useformat");

        // Only cache and split standard article GET requests for anonymous users
        const shouldCacheAndSplit = isGet && !isPhpScript && !isSpecialPage && isLoggedOut && !hasAdminAction && !hasMobileToggle && !hasExplicitFormat;
        
        let fetchOptions = {};
        let proxyRequest = request;
        
        if (shouldCacheAndSplit) {
            fetchOptions.cf = {
                cacheEverything: true,
                cacheTtl: 7200 // Keep assets hot at Cloudflare edge for 2 hours
            };

            const proxyUrl = new URL(request.url);
            let format = "desktop";
            
            // 3. Prefix-agnostic preference cookie detection
            const stopMobileMatch = cookieHeader.match(/stopMobileRedirect=([^;]+)/);
            const isStopMobileActive = stopMobileMatch && !["0", "false"].includes(stopMobileMatch[1].trim());

            if (isStopMobileActive || cookieHeader.includes("useformat=desktop")) {
                format = "desktop";
            } else if (cookieHeader.includes("useformat=mobile")) {
                format = "mobile";
            } else if (request.cf && (request.cf.deviceType === "mobile" || request.cf.deviceType === "tablet")) {
                format = "mobile";
            }
            
            // Append the format parameter to isolate desktop/mobile cache buckets cleanly
            proxyUrl.searchParams.set("useformat", format);
            proxyRequest = new Request(proxyUrl.toString(), request);
        }

        // FETCH ORIGIN (uses separate desktop/mobile cache buckets only when logged out)
        const originResponse = await fetch(proxyRequest, fetchOptions);

        const contentType = originResponse.headers.get("Content-Type") || "";
        if (!contentType.toLowerCase().includes("text/html")) {
            return originResponse;
        }

        let widgetHtml = null;
        try {
            widgetHtml = await getRecentChangesHTML(env);
        } catch {
            widgetHtml = null;
        }

        const rewriter = new HTMLRewriter();

        try {
            applyThemeRewriter(rewriter, request);
        } catch {}

        try {
            applyFeedbackRewriter(rewriter);
        } catch {}

        if (widgetHtml) {
            rewriter.on("#p-Recent_changes ul.vector-menu-content-list", {
                element(el) {
                    el.setAttribute("class", "vector-menu-content-list recent-changes-list");
                    el.setInnerContent(widgetHtml, { html: true });
                },
            });
        }

        // Transform the stream via HTMLRewriter
        let transformedResponse = rewriter.transform(originResponse);

        // BRIDGE WIKI X-CACHE-TAG TO CLOUDFLARE NATIVE CACHE-TAG INDEX
        const xCacheTag = originResponse.headers.get("X-Cache-Tag");
        if (xCacheTag) {
            const newHeaders = new Headers(transformedResponse.headers);
            newHeaders.set("Cache-Tag", xCacheTag);

            return new Response(transformedResponse.body, {
                status: transformedResponse.status,
                statusText: transformedResponse.statusText,
                headers: newHeaders
            });
        }

        return transformedResponse;
    } catch {
        return fetch(request);
    }
}
