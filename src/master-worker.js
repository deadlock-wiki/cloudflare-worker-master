import { getRecentChangesHTML } from "./recent-changes.js";
import { applyThemeRewriter } from "./theme-cookies.js";

export default {
    async fetch(request, env, ctx) {
        try {
            const url = new URL(request.url);

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

            const originResponse = await fetch(request);

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
                rewriter.on("#p-Recent_Changes ul.vector-menu-content-list", {
                    element(el) {
                        el.setAttribute("class", "vector-menu-content-list recent-changes-list");
                        el.setInnerContent(widgetHtml, { html: true });
                    },
                });
            }

            try {
                return rewriter.transform(originResponse);
            } catch {
                return originResponse;
            }
        } catch {
            return fetch(request);
        }
    },
};