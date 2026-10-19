import { handleWikiRequest } from "./wiki.js";
import { checkGameUpdate } from './game-update.js'
import { refreshRecentChanges } from './recent-changes.js'

export { GameUpdateState } from './game-update.js'

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        let finalRequest = request;

        // LOCAL DEV SHIELD
        // DEV_UPSTREAM_HOST (in .dev.vars) can point at a hostname with no Worker route, so the
        // deployed worker does not also rewrite the HTML during local testing.
        if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
            url.hostname = env.DEV_UPSTREAM_HOST || "deadlock.wiki";
            url.protocol = "https:";
            url.port = "";
            finalRequest = new Request(url, request);
        }

        return await handleWikiRequest(finalRequest, env, ctx);
    },

    async scheduled(event, eventEnv, ctx) {
        ctx.waitUntil(
            checkGameUpdate(eventEnv).catch((err) => {
                const errorMessage = err instanceof Error ? `${err.message}\n${err.stack}` : String(err);
                console.error(`game-update failed: ${errorMessage}`);
            })
        );
        ctx.waitUntil(
            refreshRecentChanges(eventEnv).catch((err) => {
                const errorMessage = err instanceof Error ? `${err.message}
${err.stack}` : String(err);
                console.error(`recent-changes refresh failed: ${errorMessage}`);
            })
        );
    },
};