// In-memory cache: stream data is valid for 5 minutes (YouTube CDN URLs last ~6h)
const cache = new Map<string, { data: Invidious; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export default async function(
  id: string,
  _prefetch: boolean = false,
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

  const streamFallback = (): Invidious => ({
    type: 'video',
    title: '',
    videoId: id,
    author: '',
    authorId: '',
    authorUrl: '',
    lengthSeconds: 0,
    description: '',
    viewCount: 0,
    adaptiveFormats: [{
      url: `/api/stream?id=${id}`,
      type: 'audio/webm; codecs="opus"',
      bitrate: '128000',
      container: 'webm',
      encoding: 'opus',
    }],
    formatStreams: [],
    recommendedVideos: [],
  } as unknown as Invidious);

  return fetchViaProxy().catch(() => streamFallback());
}
