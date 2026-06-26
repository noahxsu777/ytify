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

export async function getInstances(): Promise<Lists> {
  if (cache && Date.now() - cachedAt < TTL) return cache;

  try {
    const [listRes, ivRes] = await Promise.allSettled([
      fetch('https://raw.githubusercontent.com/n-ce/Uma/main/list.json', { signal: AbortSignal.timeout(4000) }).then(r => r.json()),
      fetch('https://raw.githubusercontent.com/n-ce/Uma/main/invidious.json', { signal: AbortSignal.timeout(4000) }).then(r => r.json()),
    ]);

    const list = listRes.status === 'fulfilled' ? listRes.value : {};
    const ivExtra = ivRes.status === 'fulfilled' && Array.isArray(ivRes.value) ? ivRes.value : [];

    // list.json instances are freshly tested -> highest priority. Cap the
    // total so we don't fan out to ~100 instances per request.
    const iv = [...new Set([...(list.iv || []), ...FALLBACK.iv, ...ivExtra])]
      .filter(u => typeof u === 'string' && u.startsWith('https://'))
      .slice(0, 12);
    const pi = [...new Set([...(list.pi || []), ...FALLBACK.pi])]
      .filter(u => typeof u === 'string' && u.startsWith('https://'));

    if (iv.length || pi.length) {
      cache = { iv: iv.length ? iv : FALLBACK.iv, pi: pi.length ? pi : FALLBACK.pi };
      cachedAt = Date.now();
      return cache;
    }
  } catch { /* use fallback */ }

  return FALLBACK;
}
