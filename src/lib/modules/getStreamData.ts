import { store, setStore } from "../stores";

// In-memory cache: stream data is valid for 5 minutes (YouTube CDN URLs last ~6h)
const cache = new Map<string, { data: Invidious; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export default async function(
  id: string,
  prefetch: boolean = false,
  signal?: AbortSignal
): Promise<Invidious | Record<'error' | 'message', string>> {

  // Return cached result if still fresh
  const cached = cache.get(id);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  const fetchViaProxy = () =>
    fetch(`/api/iv?path=/api/v1/videos/${id}`, { signal })
      .then(res => {
        if (!res.ok) throw new Error(`Proxy ${res.status}`);
        return res.json() as Promise<Invidious | { error: string }>;
      })
      .then(data => {
        if ('adaptiveFormats' in data) {
          cache.set(id, { data: data as Invidious, ts: Date.now() });
          return data;
        }
        throw new Error((data as { error: string }).error || 'Invalid response');
      });

  const fetchDirect = (index: number) =>
    fetch(`${store.invidious[index]}/api/v1/videos/${id}`, { signal })
      .then(res => res.json() as Promise<Invidious | { error: string }>)
      .then(data => {
        if ('adaptiveFormats' in data) {
          setStore('index', index);
          cache.set(id, { data: data as Invidious, ts: Date.now() });
          return data;
        }
        throw new Error((data as { error: string }).error || 'Invalid response');
      });

  const useDirect = (index = store.index): Promise<Invidious> =>
    fetchDirect(index).catch(e => {
      if (index + 1 >= store.invidious.length) return prefetch ? e : Promise.reject(e);
      return useDirect(index + 1);
    });

  return fetchViaProxy().catch(() => useDirect());
}
