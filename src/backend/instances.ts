// Fetches the maintained, regularly-tested instance lists from the n-ce/Uma
// project (the same source the app itself uses) so playback always targets
// instances that are currently working — not a stale hardcoded list.

type Lists = { iv: string[]; pi: string[] };

let cache: Lists | null = null;
let cachedAt = 0;
const TTL = 10 * 60 * 1000; // 10 min

// Hardcoded fallback (used only if the remote list is unreachable)
const FALLBACK: Lists = {
  iv: [
    'https://invidious.nikkosphere.com',
    'https://invidious.reallyaweso.me',
    'https://iv.melmac.space',
    'https://invidious.materialio.us',
    'https://inv.perditum.com',
    'https://invidious.privacyredirect.com',
    'https://invidious.darkness.services',
  ],
  pi: [
    'https://api.piped.private.coffee',
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.adminforge.de',
  ],
};

export function getInstances(): Lists {
  // Serverless functions are frequently cold-started, so the in-memory cache
  // often isn't there. Never block playback waiting on a GitHub fetch —
  // return the best data available RIGHT NOW (fresh Uma cache if we have it,
  // otherwise the fallback list) and refresh Uma in the background for the
  // next warm invocation.
  if (!cache || Date.now() - cachedAt >= TTL) {
    refreshInBackground();
  }
  return cache || FALLBACK;
}

let refreshing = false;
function refreshInBackground() {
  if (refreshing) return;
  refreshing = true;

  Promise.allSettled([
    fetch('https://raw.githubusercontent.com/n-ce/Uma/main/list.json', { signal: AbortSignal.timeout(4000) }).then(r => r.json()),
    fetch('https://raw.githubusercontent.com/n-ce/Uma/main/invidious.json', { signal: AbortSignal.timeout(4000) }).then(r => r.json()),
  ]).then(([listRes, ivRes]) => {
    const list = listRes.status === 'fulfilled' ? listRes.value : {};
    const ivExtra = ivRes.status === 'fulfilled' && Array.isArray(ivRes.value) ? ivRes.value : [];

    const iv = [...new Set([...(list.iv || []), ...FALLBACK.iv, ...ivExtra])]
      .filter(u => typeof u === 'string' && u.startsWith('https://'))
      .slice(0, 12);
    const pi = [...new Set([...(list.pi || []), ...FALLBACK.pi])]
      .filter(u => typeof u === 'string' && u.startsWith('https://'));

    if (iv.length || pi.length) {
      cache = { iv: iv.length ? iv : FALLBACK.iv, pi: pi.length ? pi : FALLBACK.pi };
      cachedAt = Date.now();
    }
  }).finally(() => { refreshing = false; });
}
