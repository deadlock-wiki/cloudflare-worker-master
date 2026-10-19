const LIMIT = 4;
const KV_KEY = "recentchanges";
// Per-data-center copy in front of KV. The Cache API is free, KV reads are billed per call.
const EDGE_TTL_MS = 60 * 1000;
// Per-isolate copy, so hot isolates skip even the Cache API lookup.
const MEMORY_TTL_MS = 10 * 1000;
// KV's own edge cache. 30s is the minimum KV allows.
const KV_CACHE_TTL_S = 30;
const EDGE_CACHE_KEY = "https://rc-cache.local/recentchanges.json";

let memory = null; // { items, at }

/**
 * Called by the cron every minute: the only place that queries api.php. Page views read the
 * stored items, so they never wait on (or stampede) the origin.
 */
export async function refreshRecentChanges(env) {
    if (!env.RC_CACHE) throw new Error("RC_CACHE KV binding missing");
    const items = await fetchItems(env);
    if (!items) return;
    await env.RC_CACHE.put(KV_KEY, JSON.stringify(items));
}

/**
 * Returns the widget HTML, or null when no data is available (the page then keeps the
 * sidebar's default content). Times are rendered per request, so "3m ago" stays accurate
 * however old the stored copy is.
 */
export async function getRecentChangesHTML(env, ctx) {
    const items = await getItems(env, ctx);
    return items ? renderWidgetItems(items) : null;
}

async function getItems(env, ctx) {
    const now = Date.now();
    if (memory && now - memory.at < MEMORY_TTL_MS) return memory.items;

    // Local dev without the KV binding: query api.php directly.
    if (!env.RC_CACHE) return await fetchItems(env);

    const cache = await caches.open("recent-changes-cache");
    const cacheKey = new Request(EDGE_CACHE_KEY);

    let stale = null;
    const cached = await cache.match(cacheKey);
    if (cached) {
        const cachedAt = Number(cached.headers.get("X-Cached-At") || 0);
        const items = await cached.json();
        if (now - cachedAt < EDGE_TTL_MS) {
            memory = { items, at: now };
            return items;
        }
        stale = items;
    }

    try {
        const items = await env.RC_CACHE.get(KV_KEY, { type: "json", cacheTtl: KV_CACHE_TTL_S });
        if (items) {
            memory = { items, at: now };
            const put = cache.put(
                cacheKey,
                new Response(JSON.stringify(items), {
                    headers: {
                        "Content-Type": "application/json",
                        // Kept long so a stale copy survives a KV outage; freshness is X-Cached-At.
                        "Cache-Control": "max-age=86400",
                        "X-Cached-At": String(now),
                    },
                })
            );
            if (ctx) ctx.waitUntil(put);
            else await put;
            return items;
        }
    } catch (err) {
        console.error("recent-changes: KV read failed:", err);
    }

    return stale;
}

async function fetchItems(env) {
    if (!env || !env.MEDIAWIKI_API) return null;

    try {
        const upstream = await fetch(buildApiUrl(env), {
            headers: { "User-Agent": "deadlock-wiki-worker" },
        });
        if (!upstream.ok) {
            console.error(`recent-changes: api.php returned ${upstream.status}`);
            return null;
        }
        const data = await upstream.json();
        return data?.query?.recentchanges ?? [];
    } catch (err) {
        console.error("recent-changes: api.php request failed:", err);
        return null;
    }
}

function buildApiUrl(env) {
    const api = new URL(env.MEDIAWIKI_API);
    api.searchParams.set("action", "query");
    api.searchParams.set("list", "recentchanges");
    api.searchParams.set("rcprop", "title|timestamp|user|ids|flags");
    api.searchParams.set("rctype", "edit|new");
    api.searchParams.set("rcnamespace", "0");
    // Only the latest revision per page, so one page edited repeatedly takes one slot
    api.searchParams.set("rctoponly", "1");
    api.searchParams.set("rclimit", String(LIMIT));
    api.searchParams.set("format", "json");
    return api.toString();
}

function renderWidgetItems(items) {
    let html = "";

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const id = "n-change" + (i + 1);
        const title = String(item.title || "Unknown");
        const userName = String(item.user || "Unknown");

        const safeTitle = escapeHtml(title);
        const safeUserName = escapeHtml(userName);
        const timeText = escapeHtml(formatRelativeTime(item.timestamp));
        const titleUrl = escapeHtml(getPageUrl(title));
        const diffUrl = escapeHtml(getDiffUrl(item));
        const userUrl = item.user ? escapeHtml(getContributionsUrl(item.user)) : null;

        html += `<li class="mw-list-item recent-changes-item" id="${id}"><a class="recent-changes-title" href="${titleUrl}" title="${safeTitle}"><span>${safeTitle}</span></a><div class="recent-changes-meta"><a class="recent-changes-time" href="${diffUrl}" title="View diff for ${safeTitle}">${timeText}</a> · ${
            item.user
                ? `<a class="recent-changes-user" href="${userUrl}">${safeUserName}</a>`
                : `<span class="recent-changes-user">${safeUserName}</span>`
        }</div></li>`;
    }

    html += `<li class="mw-list-item recent-changes-item" id="n-change-more"><a class="recent-changes-title" href="/Special:RecentChanges"><span>Show more...</span></a></li>`;

    return html;
}

// Port of mw.util.wikiUrlencode: encodes ?, #, % etc. but keeps : and / readable
function wikiUrlencode(str) {
    return encodeURIComponent(String(str || "").replace(/ /g, "_"))
        .replace(/%3B/g, ";")
        .replace(/%40/g, "@")
        .replace(/%24/g, "$")
        .replace(/%21/g, "!")
        .replace(/%2A/g, "*")
        .replace(/%28/g, "(")
        .replace(/%29/g, ")")
        .replace(/%2C/g, ",")
        .replace(/%2F/g, "/")
        .replace(/%7E/g, "~")
        .replace(/%3A/g, ":");
}

function getPageUrl(title) {
    return "/" + wikiUrlencode(title);
}

function getContributionsUrl(user) {
    return "/Special:Contributions/" + wikiUrlencode(user);
}

function getDiffUrl(item) {
    if (item && item.revid) {
        return "/Special:Diff/" + encodeURIComponent(String(item.revid));
    }
    return "/Special:RecentChanges";
}

function formatRelativeTime(timestamp) {
    const then = new Date(timestamp).getTime();
    if (!Number.isFinite(then)) return "";

    const now = Date.now();
    const diffSeconds = Math.round((now - then) / 1000);
    const abs = Math.abs(diffSeconds);

    let value;
    let short;

    if (abs < 60) {
        short = "s";
        value = diffSeconds;
    } else if (abs < 3600) {
        short = "m";
        value = Math.round(diffSeconds / 60);
    } else if (abs < 86400) {
        short = "h";
        value = Math.round(diffSeconds / 3600);
    } else {
        short = "d";
        value = Math.round(diffSeconds / 86400);
    }

    const n = Math.abs(value);
    return diffSeconds < 0 ? "in " + n + short : n + short + " ago";
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
