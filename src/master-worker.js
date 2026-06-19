// src/master-worker.js
import { handleWikiRequest } from "./wiki.js";

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        let finalRequest = request;

        // LOCAL DEV SHIELD
        // This only applies if you are running `npx wrangler dev`
        if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
            url.hostname = "deadlock.wiki"; 
            url.protocol = "https:"; 
            url.port = ""; 
            
            finalRequest = new Request(url, request);
        }

        // Pass the request to your isolated logic file
        return await handleWikiRequest(finalRequest, env);
    },
};