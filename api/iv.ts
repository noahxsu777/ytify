import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getInstances } from '../src/backend/instances.js';

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
    signal: AbortSignal.timeout(7000),
    headers: { 'Content-Type': 'application/json' },
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

  const { iv: INVIDIOUS, pi: PIPED } = getInstances();

  // ── Video request ──
  // FAST PATH: race sources that return directly-playable (instance-proxied)
  // audio URLs, so the browser can play in ONE round trip (no /api/stream hop).
  if (videoId) {
    const hasPlayableAudio = (d: any) =>
      Array.isArray(d?.adaptiveFormats) &&
      d.adaptiveFormats.some((f: any) => (f.type || '').startsWith('audio') && /^https?:\/\//.test(f.url || ''));

    const playable = await Promise.any([
      // Piped audioStreams are already instance-proxied -> play cross-IP
      ...PIPED.map(inst =>
        tryFetch(`${inst}/streams/${videoId}`).then(d => {
          const data = pipedToInvidious(d, videoId);
          if (!hasPlayableAudio(data)) throw new Error('no audio');
          return data;
        })
      ),
      // Invidious with local=true -> instance-proxied audio
      ...INVIDIOUS.map(inst =>
        tryFetch(`${inst}/api/v1/videos/${videoId}?local=true`).then(d => {
          d.adaptiveFormats = (d.adaptiveFormats || []).map((f: any) => ({
            ...f, url: f.url?.startsWith('/') ? inst + f.url : f.url,
          }));
          if (!hasPlayableAudio(d)) throw new Error('no audio');
          return d;
        })
      ),
    ]).catch(() => null);

    if (playable && 'lengthSeconds' in playable) {
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
      return res.status(200).json(playable);
    }

    // FALLBACK: couldn't get a proxied URL — get metadata any way we can and
    // route audio through /api/stream (which byte-proxies InnerTube).
    let meta: any = null;
    try {
      meta = await Promise.any([
        fetchInnertube(videoId),
        ...INVIDIOUS.map(inst => tryFetch(`${inst}${path}${suffix}`)),
        ...PIPED.map(inst => tryFetch(`${inst}/streams/${videoId}`).then(d => pipedToInvidious(d, videoId))),
      ]);
    } catch { /* nothing answered */ }

    if (!meta || !('lengthSeconds' in meta)) {
      return res.status(502).json({ error: 'All sources failed' });
    }

    meta.adaptiveFormats = [{
      url: `/api/stream?id=${videoId}`,
      type: 'audio/webm; codecs="opus"',
      bitrate: '128000',
      container: 'webm',
      audioQuality: 'AUDIO_QUALITY_MEDIUM',
      audioSampleRate: '48000',
      audioChannels: 2,
      encoding: 'opus',
    }];
    meta.formatStreams = [];

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
    return res.status(200).json(meta);
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
