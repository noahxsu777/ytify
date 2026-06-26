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

const tryFetch = (url: string, opts: RequestInit = {}) =>
  fetch(url, {
    signal: AbortSignal.timeout(6000),
    headers: { 'User-Agent': 'Mozilla/5.0' },
    ...opts,
  }).then(r => {
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json();
  });

/* ── YouTube InnerTube player (most reliable — Google directly) ── */
async function fetchInnertube(id: string): Promise<any> {
  // iOS client returns pre-deciphered stream URLs without signature ciphers
  const clients = [
    {
      clientName: 'IOS',
      clientVersion: '19.45.4',
      deviceModel: 'iPhone16,2',
      userAgent: 'com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 18_1_0 like Mac OS X)',
      hl: 'en', gl: 'US',
    },
    {
      clientName: 'ANDROID',
      clientVersion: '19.44.38',
      androidSdkVersion: 34,
      userAgent: 'com.google.android.youtube/19.44.38 (Linux; U; Android 14) gzip',
      hl: 'en', gl: 'US',
    },
  ];

  for (const client of clients) {
    try {
      const res = await fetch('https://youtubei.googleapis.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8', {
        method: 'POST',
        signal: AbortSignal.timeout(7000),
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': client.userAgent,
        },
        body: JSON.stringify({
          context: { client },
          videoId: id,
          contentCheckOk: true,
          racyCheckOk: true,
        }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const formats = (data?.streamingData?.adaptiveFormats || []).filter((f: any) => f.url);
      if (formats.length) return innertubeToInvidious(data, id, formats);
    } catch { /* try next client */ }
  }
  throw new Error('innertube failed');
}

function innertubeToInvidious(data: any, id: string, formats: any[]): any {
  const vd = data.videoDetails || {};
  return {
    type: 'video',
    title: vd.title || '',
    videoId: id,
    author: vd.author || '',
    authorId: vd.channelId || '',
    authorUrl: vd.channelId ? `/channel/${vd.channelId}` : '',
    lengthSeconds: parseInt(vd.lengthSeconds || '0'),
    description: vd.shortDescription || '',
    viewCount: parseInt(vd.viewCount || '0'),
    adaptiveFormats: formats.map((f: any) => ({
      url: f.url,
      type: f.mimeType || 'audio/webm',
      bitrate: String(f.bitrate || 0),
      container: (f.mimeType || '').includes('webm') ? 'webm' : 'mp4',
      audioQuality: f.audioQuality,
      audioSampleRate: f.audioSampleRate,
      audioChannels: f.audioChannels || 2,
      encoding: f.mimeType,
    })),
    formatStreams: [],
    recommendedVideos: [],
  };
}

/* ── Piped → Invidious shape ── */
function pipedToInvidious(piped: any, id: string): any {
  const audioFormats = (piped.audioStreams || []).map((s: any) => ({
    url: s.url, type: s.mimeType || 'audio/webm;codecs=opus',
    bitrate: String(s.bitrate || 0), container: s.format || 'webm',
    audioQuality: s.quality, audioSampleRate: String(s.audioSampleRate || 44100), audioChannels: 2,
  }));
  const videoFormats = (piped.videoStreams || []).map((s: any) => ({
    url: s.url, type: s.mimeType || 'video/mp4',
    bitrate: String(s.bitrate || 0), quality: s.quality || '360p', container: s.format || 'mp4',
  }));
  return {
    type: 'video', title: piped.title || '', videoId: id,
    author: piped.uploader || '', authorId: piped.uploaderUrl?.split('/').pop() || '',
    authorUrl: piped.uploaderUrl || '', lengthSeconds: piped.duration || 0,
    description: piped.description || '', viewCount: piped.views || 0,
    adaptiveFormats: [...audioFormats, ...videoFormats], formatStreams: [],
    recommendedVideos: (piped.relatedStreams || []).slice(0, 20).map((r: any) => ({
      videoId: r.url?.split('=').pop() || '', title: r.title || '',
      author: r.uploaderName || '', authorId: r.uploaderUrl?.split('/').pop() || '',
      viewCountText: String(r.views || 0), lengthSeconds: r.duration || 0,
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

  const videoIdMatch = path.match(/^\/api\/v1\/videos\/([a-zA-Z0-9_-]+)/);
  const videoId = videoIdMatch?.[1];

  res.setHeader('Access-Control-Allow-Origin', '*');

  // ── Video request: try YouTube InnerTube first (fast + reliable), then race the rest ──
  if (videoId) {
    try {
      const data = await fetchInnertube(videoId);
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
      return res.status(200).json(data);
    } catch { /* fall through to Invidious/Piped race */ }

    try {
      const data = await Promise.any([
        ...INVIDIOUS.map(inst => tryFetch(`${inst}${path}${suffix}`)),
        ...PIPED.map(inst => tryFetch(`${inst}/streams/${videoId}`).then(d => pipedToInvidious(d, videoId))),
      ]);
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
      return res.status(200).json(data);
    } catch {
      return res.status(502).json({ error: 'All sources failed' });
    }
  }

  // ── Search / channels: race Invidious instances ──
  try {
    const data = await Promise.any(INVIDIOUS.map(inst => tryFetch(`${inst}${path}${suffix}`)));
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(data);
  } catch {
    return res.status(502).json({ error: 'All instances failed' });
  }
}
