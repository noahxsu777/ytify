// Resolve metadata from the same public Invidious instances as upstream ytify.
// Responses are short-lived because the audio URLs expire.
const cache = new Map<string, { data: Invidious; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;
const INSTANCES = [
  'https://yt.omada.cafe',
  'https://invidious.schenkel.eti.br',
  'https://invidious.kemonomimi.nl',
  'https://echostreamz.com',
];

export default async function(
  id: string,
  _prefetch: boolean = false,
  signal?: AbortSignal
): Promise<Invidious | Record<'error' | 'message', string>> {
  const cached = cache.get(id);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const controllers = INSTANCES.map(() => new AbortController());
  const abort = () => controllers.forEach(c => c.abort());
  signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, 3000);
  try {
    const data = await Promise.any(INSTANCES.map(async (instance, index) => {
      const response = await fetch(`${instance}/api/v1/videos/${encodeURIComponent(id)}?local=true`, {
        headers: { Accept: 'application/json' }, signal: controllers[index].signal,
      });
      if (!response.ok) throw new Error(`Invidious ${response.status}`);
      const item = await response.json() as Invidious;
      if (!Array.isArray(item.adaptiveFormats) || !item.adaptiveFormats.some(f => f.type?.startsWith('audio') && f.url))
        throw new Error('No audio formats');
      // The instance, not an untrusted redirect, proxies the audio bytes.
      item.adaptiveFormats = item.adaptiveFormats.map(format => {
        try {
          const url = new URL(format.url, instance);
          if (url.protocol !== 'https:' || !url.pathname.includes('videoplayback')) return { ...format, url: '' };
          return { ...format, url: `${instance}${url.pathname}${url.search}` };
        } catch { return { ...format, url: '' }; }
      });
      if (!item.adaptiveFormats.some(f => f.type?.startsWith('audio') && f.url)) throw new Error('No proxied audio');
      return item;
    }));
    if (signal?.aborted) throw new Error('Aborted');
    cache.set(id, { data, ts: Date.now() });
    return data;
  } catch {
    return { error: 'No Invidious source', message: 'Using local audio source' };
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
    abort();
  }
}
