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

        // Programmatic subrequest edge caching
        const isGet = request.method === "GET";
        const isPhpScript = url.pathname.includes(".php");
        const isLoggedOut = !cookieHeader.includes("deadlockUserID=");
        
        // FIX: Do not optimize or force formats if a view toggle or explicit format is requested
        const hasNoAction = !url.searchParams.has("action") && 
                            !url.searchParams.has("mobileaction") && 
                            !url.searchParams.has("useformat");
        
        let fetchOptions = {};
        let proxyRequest = request;
        
        if (isGet && !isPhpScript && isLoggedOut && hasNoAction) {
            fetchOptions.cf = {
                cacheEverything: true,
                cacheTtl: 7200 // Keep assets hot at the edge for 2 hours
            };

            // Split Cloudflare edge cache into separate Desktop and Mobile buckets
            const proxyUrl = new URL(request.url);
            if (!proxyUrl.searchParams.has("useformat")) {
                let format = "desktop";
                
                // Check for MediaWiki MobileFrontend explicit desktop preferences
                if (cookieHeader.includes("stopMobileRedirect=1") || cookieHeader.includes("mf_useformat=desktop")) {
                    format = "desktop";
                // Check for explicit mobile preferences
                } else if (cookieHeader.includes("mf_useformat=mobile")) {
                    format = "mobile";
                // Fallback to Cloudflare edge device detection if no preference cookies are present
                } else if (request.cf && (request.cf.deviceType === "mobile" || request.cf.deviceType === "tablet")) {
                    format = "mobile";
                }
                
                // Append the format into the cache-key URL context natively understood by MediaWiki
                proxyUrl.searchParams.set("useformat", format);
                proxyRequest = new Request(proxyUrl.toString(), request);
            }
        }

        // FETCH ORIGIN (using the separated proxy URL bucket if logged out)
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
            // 'Cache-Tag' registers this response into Cloudflare's surgical purge-by-tag engine
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
