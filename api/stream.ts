import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Readable } from 'node:stream';
import { forgetPlayable, getPlayableAudio } from '../src/backend/yt_player.js';
import { getInstances } from '../src/backend/instances.js';

export const config = { maxDuration: 60 };

const IOS_UA = 'com.google.ios.youtube/20.11.6 (iPhone10,4; U; CPU iOS 16_7_7 like Mac OS X)';
const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function parseRange(raw?: string): { start: number; end?: number } | null {
  if (!raw) return null;
  const m = raw.match(/bytes=(\d+)-(\d+)?/);
  if (!m) return null;
  return { start: parseInt(m[1], 10), end: m[2] !== undefined ? parseInt(m[2], 10) : undefined };
}

function pickAudio(formats: any[]): any | null {
  const audio = (formats || []).filter((f: any) =>
    (f.mimeType || f.type || f.mime_type || '').toString().startsWith('audio') && f.url
  );
  if (!audio.length) return null;
  audio.sort((a: any, b: any) => {
    const rank = (f: any) => {
      const mime = `${f.mimeType || f.type || f.mime_type || ''}`;
      const lc = /mp4a\.40\.2/i.test(mime) ? 3 : 0;
      const aac = /mp4|mp4a|aac/i.test(mime) ? 2 : 0;
      return lc + aac + (Number(f.bitrate) || 0) / 1e6;
    };
    return rank(b) - rank(a);
  });
  return audio[0];
}

async function fetchUpstream(url: string, range?: string) {
  const googlevideo = url.includes('googlevideo.com');
  const headers: Record<string, string> = {
    'User-Agent': googlevideo ? IOS_UA : BROWSER_UA,
    Accept: '*/*',
  };
  if (range) headers.Range = range;
  let upstream = await fetch(url, { headers, redirect: 'follow' });
  if (!upstream.ok && upstream.status !== 206) {
    await new Promise((r) => setTimeout(r, 200));
    upstream = await fetch(url, { headers, redirect: 'follow' });
  }
  return upstream;
}

async function pipeBody(upstream: Response, res: VercelResponse) {
  if (!upstream.body) {
    res.end();
    return;
  }
  const nodeStream = Readable.fromWeb(upstream.body as any);
  await new Promise<void>((resolve, reject) => {
    nodeStream.on('error', reject);
    res.on('close', () => { nodeStream.destroy(); resolve(); });
    res.on('finish', () => resolve());
    nodeStream.pipe(res);
  });
}

async function viaInnertube(id: string): Promise<{ url: string; mime: string } | null> {
  try {
    const p = await getPlayableAudio(id);
    return { url: p.url, mime: p.mime };
  } catch {
    return null;
  }
}

async function viaPiped(id: string): Promise<{ url: string; mime: string } | null> {
  const { pi } = getInstances();
  const probe = (inst: string) =>
    fetch(`${inst}/streams/${id}`, { signal: AbortSignal.timeout(2500) }).then(async r => {
      if (!r.ok) throw new Error(`${r.status}`);
      const d = await r.json();
      const picked = pickAudio(d.audioStreams || []);
      if (picked?.url) return { url: picked.url as string, mime: (picked.mimeType || 'audio/mp4') as string };
      throw new Error('no audio');
    });
  try { return await Promise.any(pi.map(probe)); } catch { return null; }
}

async function viaInvidious(id: string): Promise<{ url: string; mime: string } | null> {
  const { iv } = getInstances();
  const probe = (inst: string) =>
    fetch(`${inst}/api/v1/videos/${id}`, { signal: AbortSignal.timeout(2500) }).then(async r => {
      if (!r.ok) throw new Error(`${r.status}`);
      const d = await r.json();
      const picked = pickAudio(d.adaptiveFormats || []);
      if (picked?.url) return { url: picked.url as string, mime: (picked.type || picked.mimeType || 'audio/mp4') as string };
      throw new Error('no audio');
    });
  try { return await Promise.any(iv.slice(0, 8).map(probe)); } catch { return null; }
}

type Source = 'auto' | 'innertube' | 'piped' | 'iv';

function orderFor(src: Source) {
  if (src === 'piped') return [viaPiped, viaInvidious, viaInnertube] as const;
  if (src === 'iv') return [viaInvidious, viaPiped, viaInnertube] as const;
  if (src === 'innertube') return [viaInnertube, viaPiped, viaInvidious] as const;
  return [viaInnertube, viaPiped, viaInvidious] as const;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Range');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
    return res.status(204).end();
  }

  const id = req.query.id as string;
  if (!id || !/^[a-zA-Z0-9_-]{11}$/.test(id)) {
    return res.status(400).json({ error: 'Invalid video id' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Range');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');

  const CHUNK = 512 * 1024;
  const rawRange = Array.isArray(req.headers.range) ? req.headers.range[0] : req.headers.range;
  const clientRange = parseRange(rawRange);
  // googlevideo 403s full-file and open-ended `bytes=N-` requests.
  const rangeHeader = clientRange
    ? (clientRange.end !== undefined
      ? `bytes=${clientRange.start}-${clientRange.end}`
      : `bytes=${clientRange.start}-${clientRange.start + CHUNK - 1}`)
    : `bytes=0-${CHUNK - 1}`;

  const src = (String(req.query.src || 'auto') as Source);
  const resolvers = orderFor(src);

  for (const resolve of resolvers) {
    const playable = await resolve(id);
    if (!playable?.url) continue;
    try {
      const upstream = await fetchUpstream(playable.url, rangeHeader);
      if (!upstream.ok && upstream.status !== 206) {
        if (resolve === viaInnertube) forgetPlayable(id);
        continue;
      }
      res.setHeader('Content-Type', upstream.headers.get('content-type') || playable.mime);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'private, max-age=0');
      const len = upstream.headers.get('content-length');
      const cr = upstream.headers.get('content-range');
      res.status(upstream.status);
      if (len) res.setHeader('Content-Length', len);
      if (cr) res.setHeader('Content-Range', cr);
      await pipeBody(upstream, res);
      return;
    } catch (e) {
      console.error('pipe failed', resolve.name, e);
      if (resolve === viaInnertube) forgetPlayable(id);
    }
  }

  return res.status(502).json({ error: 'No playable source found' });
}
