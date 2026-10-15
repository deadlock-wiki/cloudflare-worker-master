import { DurableObject } from "cloudflare:workers";

const STATE_KEY = 'last_hash';

/**
 * Holds the last dispatched commit hash. A single named Durable Object instance is strongly
 * consistent across all Cloudflare locations, unlike KV whose reads can be up to 60s stale
 * (which let consecutive cron runs in different colos dispatch Deadbot twice).
 */
export class GameUpdateState extends DurableObject {
    async getHash() {
        let hash = await this.ctx.storage.get(STATE_KEY);
        if (hash === undefined) {
            // One-time migration from the previous KV-based state
            hash = (await this.env.GAME_UPDATE_STATE?.get(STATE_KEY)) ?? null;
            await this.ctx.storage.put(STATE_KEY, hash);
        }
        return hash;
    }

    async setHash(hash) {
        await this.ctx.storage.put(STATE_KEY, hash);
    }
}

export async function checkGameUpdate(env) {
    const latestHash = await getLatestHash(env.DEADBOT_GH_TOKEN);
    const state = env.GAME_UPDATE_DO.get(env.GAME_UPDATE_DO.idFromName('singleton'));
    const previousHash = await state.getHash();

    if (latestHash === previousHash) {
        console.info('Latest hash has not changed');
        return;
    }

    console.info(`New hash ${latestHash} found, dispatching Deadbot`)
    await dispatchDeadbot(env.DEADBOT_GH_TOKEN);
    await state.setHash(latestHash);
    console.info('✅ Done!')
}

async function getLatestHash(ghToken) {
    const STEAMDB_REPO_LATEST_COMMIT_URL = 'https://api.github.com/repos/SteamDatabase/GameTracking-Deadlock/commits?per_page=1';

    const res = await fetch(STEAMDB_REPO_LATEST_COMMIT_URL, {
        headers: {
            Authorization: `Bearer ${ghToken}`,
            Accept: 'application/vnd.github+json',
            'User-Agent': 'deadlock-wiki-worker',
        },
        cf: { cacheTtl: 0 },
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`GitHub API returned status ${res.status}: ${errorText}`);
    }

    const data = await res.json();
    const sha = data?.[0]?.sha;

    if (!sha) {
        throw new Error('Commit hash not found in response body');
    }

    return sha;
}

async function dispatchDeadbot(ghToken) {    
    const DISPATCH_URL = 'https://api.github.com/repos/deadlock-wiki/deadbot/actions/workflows/auto-deploy.yaml/dispatches';
    const res = await fetch(DISPATCH_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${ghToken}`,
            Accept: 'application/vnd.github+json',
            'User-Agent': 'deadlock-wiki-worker',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            ref: 'develop',
        }),
    });

    if (!res.ok) {
        const body = await res.text();
        throw new Error(`GitHub workflow dispatch failed: ${res.status} ${body}`);
    }
}
