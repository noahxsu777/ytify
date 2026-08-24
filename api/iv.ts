import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getInstances } from '../src/backend/instances.js';

const tryFetch = (url: string, opts: RequestInit = {}) =>
  fetch(url, {
    signal: AbortSignal.timeout(2500),
    headers: { 'User-Agent': 'Mozilla/5.0' },
    ...opts,
  }).then(r => {
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json();
  });

/* ── YouTube InnerTube player (most reliable — Google directly) ── */
async function fetchInnertube(id: string): Promise<any> {
  // ANDROID_VR returns direct, un-ciphered URLs and (unlike IOS/ANDROID) does
  // not require Play-Integrity attestation, so it works from servers.
  const client = {
    clientName: 'ANDROID_VR',
    clientVersion: '1.60.19',
    deviceMake: 'Oculus',
    deviceModel: 'Quest 3',
    androidSdkVersion: 32,
    osName: 'Android',
    osVersion: '12',
    hl: 'en', gl: 'US',
  };

  const res = await fetch('https://youtubei.googleapis.com/youtubei/v1/player', {
    method: 'POST',
    signal: AbortSignal.timeout(5000),
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'com.google.android.apps.youtube.vr/1.60.19 (Linux; U; Android 12; Quest 3) gzip',
    },
    body: JSON.stringify({ context: { client }, videoId: id, contentCheckOk: true, racyCheckOk: true }),
  });
  if (!res.ok) throw new Error(`innertube ${res.status}`);
  const data = await res.json();
  const formats = (data?.streamingData?.adaptiveFormats || []).filter((f: any) => f.url);
  if (formats.length) return innertubeToInvidious(data, id, formats);
  throw new Error('innertube no formats');
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
      // googlevideo URLs are IP-locked to whoever requested them (the Vercel
      // server). Route playback through our own /api/stream proxy so the
      // bytes are fetched server-side (matching IP) and piped to the browser.
      url: `/api/stream?id=${id}&itag=${f.itag}`,
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

  const { iv: INVIDIOUS } = getInstances();

  // ── Video request ──
  // Metadata from InnerTube; the browser always plays via same-origin /api/stream.
  if (videoId) {
    const streamOnly = (extra: Record<string, unknown> = {}) => ({
      type: 'video',
      title: '',
      videoId,
      author: '',
      authorId: '',
      authorUrl: '',
      lengthSeconds: 0,
      description: '',
      viewCount: 0,
      adaptiveFormats: [{
        url: `/api/stream?id=${videoId}`,
        type: 'audio/mp4; codecs="mp4a.40.2"',
        bitrate: '128000',
        container: 'mp4',
        encoding: 'aac',
      }],
      formatStreams: [],
      recommendedVideos: [],
      ...extra,
    });

    try {
      const d = await fetchInnertube(videoId);
      d.adaptiveFormats = streamOnly().adaptiveFormats;
      d.formatStreams = [];
      res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=600');
      return res.status(200).json(d);
    } catch {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(streamOnly());
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
