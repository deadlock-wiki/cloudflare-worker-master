const LIMIT = 4;
const TTL_MS = 60 * 1000;
const HTML_CACHE_KEY = "https://rc-cache.local/recentchanges.html";

/**
 * Returns the widget HTML. Serves the cached copy immediately and, when it is older than
 * TTL_MS, refreshes it in the background (stale-while-revalidate) so page requests never
 * wait on api.php once the cache is warm.
 */
export async function getRecentChangesHTML(env, ctx) {
    const cache = await caches.open("recent-changes-cache");
    const cacheKey = new Request(HTML_CACHE_KEY);

    const htmlCached = await cache.match(cacheKey);
    if (htmlCached) {
        const cachedAt = Number(htmlCached.headers.get("X-Cached-At") || 0);
        const html = await htmlCached.text();
        const isStale = !cachedAt || Date.now() - cachedAt >= TTL_MS;

        if (isStale) {
            const refresh = refreshCache(env, cache, cacheKey, ctx);
            if (ctx) {
                ctx.waitUntil(refresh);
            } else {
                await refresh;
            }
        }
        return html;
    }

    // Cold cache: nothing to serve yet, so wait for the first build.
    return await refreshCache(env, cache, cacheKey, ctx);
}

async function refreshCache(env, cache, cacheKey, ctx) {
    if (!env || !env.MEDIAWIKI_API) return null;

    let data;
    try {
        const upstream = await fetch(buildApiUrl(env), {
            headers: { "User-Agent": "deadlock-wiki-worker" },
        });
        if (!upstream.ok) {
            console.error(`recent-changes: api.php returned ${upstream.status}`);
            return null;
        }
        data = await upstream.json();
    } catch (err) {
        console.error("recent-changes: api.php request failed:", err);
        return null;
    }

    const innerHtml = renderWidgetItems(data?.query?.recentchanges ?? []);

    const put = cache.put(
        cacheKey,
        new Response(innerHtml, {
            headers: {
                "Content-Type": "text/html; charset=utf-8",
                "Cache-Control": "max-age=31536000",
                "X-Cached-At": String(Date.now()),
            },
        })
    );
    if (ctx) {
        ctx.waitUntil(put);
    } else {
        await put;
    }

    return innerHtml;
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
