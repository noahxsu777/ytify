import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getInstances } from '../src/backend/instances.js';
import { getPlayableAudio } from '../src/backend/yt_player.js';

const tryFetch = (url: string, opts: RequestInit = {}) =>
  fetch(url, {
    signal: AbortSignal.timeout(2500),
    headers: { 'User-Agent': 'Mozilla/5.0' },
    ...opts,
  }).then(r => {
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json();
  });

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

  if (videoId) {
    try {
      const p = await getPlayableAudio(videoId);
      res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=600');
      return res.status(200).json({
        type: 'video',
        title: p.title,
        videoId,
        author: p.author,
        authorId: p.authorId,
        authorUrl: p.authorId ? `/channel/${p.authorId}` : '',
        lengthSeconds: p.lengthSeconds,
        description: '',
        viewCount: 0,
        adaptiveFormats: [{
          url: `/api/stream?id=${videoId}`,
          type: p.mime,
          bitrate: '128000',
          container: p.mime.includes('mp4') ? 'mp4' : 'webm',
          encoding: 'aac',
        }],
        formatStreams: [],
        recommendedVideos: [],
      });
    } catch (e) {
      console.error('iv resolve failed', e);
      // Don't 502 — the player still has /api/stream as a source.
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({
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
      });
    }
  }

  const { iv: INVIDIOUS } = getInstances();
  try {
    const data = await Promise.any(INVIDIOUS.map(inst => tryFetch(`${inst}${path}${suffix}`)));
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(data);
  } catch {
    return res.status(502).json({ error: 'All instances failed' });
  }
}
