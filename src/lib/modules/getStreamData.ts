import { store, setStore } from "../stores";

export default async function(
  id: string,
  prefetch: boolean = false,
  signal?: AbortSignal
): Promise<Invidious | Record<'error' | 'message', string>> {

  // Try the Vercel proxy first — it retries multiple Invidious instances server-side
  // and avoids browser-side CORS / reachability issues.
  const fetchViaProxy = () =>
    fetch(`/api/iv?path=/api/v1/videos/${id}`, { signal })
      .then(res => {
        if (!res.ok) throw new Error(`Proxy ${res.status}`);
        return res.json() as Promise<Invidious | { error: string }>;
      })
      .then(data => {
        if ('adaptiveFormats' in data) return data;
        throw new Error((data as { error: string }).error || 'Invalid response');
      });

  // Direct Invidious fallback (used if proxy also fails)
  const fetchDirect = (index: number) =>
    fetch(`${store.invidious[index]}/api/v1/videos/${id}`, { signal })
      .then(res => res.json() as Promise<Invidious | { error: string }>)
      .then(data => {
        if ('adaptiveFormats' in data) {
          setStore('index', index);
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
