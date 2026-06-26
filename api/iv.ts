import type { VercelRequest, VercelResponse } from '@vercel/node';

const INVIDIOUS = [
  'https://inv.nadeko.net',
  'https://invidious.jing.rocks',
  'https://iv.datura.network',
  'https://invidious.io.lol',
  'https://inv.tux.pizza',
  'https://invidious.privacyredirect.com',
  'https://yt.omada.cafe',
  'https://invidious.nikkosphere.com',
];

const PIPED = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://api.piped.projectsegfau.lt',
];

// Convert Piped /streams/{id} response to Invidious /api/v1/videos/{id} shape
function pipedToInvidious(piped: any, id: string): any {
  const audioFormats = (piped.audioStreams || []).map((s: any) => ({
    url: s.url,
    type: s.mimeType || 'audio/webm;codecs=opus',
    bitrate: String(s.bitrate || 0),
    container: s.format || 'webm',
    audioQuality: s.quality || 'AUDIO_QUALITY_MEDIUM',
    audioSampleRate: String(s.audioSampleRate || 44100),
    audioChannels: 2,
  }));
  const videoFormats = (piped.videoStreams || []).map((s: any) => ({
    url: s.url,
    type: s.mimeType || 'video/mp4',
    bitrate: String(s.bitrate || 0),
    quality: s.quality || '360p',
    container: s.format || 'mp4',
  }));
  return {
    type: 'video',
    title: piped.title || '',
    videoId: id,
    author: piped.uploader || '',
    authorId: piped.uploaderUrl?.split('/').pop() || '',
    authorUrl: piped.uploaderUrl || '',
    lengthSeconds: piped.duration || 0,
    description: piped.description || '',
    viewCount: piped.views || 0,
    published: piped.uploadedDate || '',
    adaptiveFormats: [...audioFormats, ...videoFormats],
    formatStreams: [],
    recommendedVideos: (piped.relatedStreams || []).slice(0, 20).map((r: any) => ({
      videoId: r.url?.split('=').pop() || '',
      title: r.title || '',
      author: r.uploaderName || '',
      authorId: r.uploaderUrl?.split('/').pop() || '',
      viewCountText: String(r.views || 0),
      lengthSeconds: r.duration || 0,
    })),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = req.query.path as string;
  if (!path || !path.startsWith('/api/v1/')) {
    return res.status(400).json({ error: 'Invalid path' });
  }

  const allowed = ['/api/v1/videos/', '/api/v1/search', '/api/v1/channels/'];
  if (!allowed.some(a => path.startsWith(a))) {
    return res.status(403).json({ error: 'Path not allowed' });
  }

  const extraParams = Object.entries(req.query)
    .filter(([k]) => k !== 'path')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  const suffix = extraParams ? (path.includes('?') ? '&' : '?') + extraParams : '';

  // Extract video ID for Piped parallel track
  const videoIdMatch = path.match(/^\/api\/v1\/videos\/([a-zA-Z0-9_-]+)/);
  const videoId = videoIdMatch?.[1];

  const tryFetch = (url: string) =>
    fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'Mozilla/5.0' },
    }).then(r => {
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json();
    });

  // Build race pool: all Invidious instances + Piped instances (for video requests)
  const invidiousPromises = INVIDIOUS.map(inst =>
    tryFetch(`${inst}${path}${suffix}`)
  );

  const pipedPromises = videoId
    ? PIPED.map(inst =>
        tryFetch(`${inst}/streams/${videoId}`).then(data => pipedToInvidious(data, videoId))
      )
    : [];

  try {
    const data = await Promise.any([...invidiousPromises, ...pipedPromises]);

    // Cache responses: stream URLs are valid ~6h; cache 5min at edge, serve stale up to 1h
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(data);
  } catch {
    return res.status(502).json({ error: 'All instances failed' });
  }
}
