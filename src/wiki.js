// src/wiki.js
import { getRecentChangesHTML } from "./recent-changes.js";
import { applyThemeRewriter } from "./theme-cookies.js";

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
        const hasNoAction = !url.searchParams.has("action");

        let fetchOptions = {};
        if (isGet && !isPhpScript && isLoggedOut && hasNoAction) {
            fetchOptions.cf = {
                cacheEverything: true,
                cacheTtl: 7200 // Keep assets hot at the edge for 2 hours
            };
        }

        // FETCH ORIGIN
        const originResponse = await fetch(request, fetchOptions);

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
