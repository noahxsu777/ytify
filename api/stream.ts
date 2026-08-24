import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Readable } from 'node:stream';
import { getPlayableAudio } from '../src/backend/yt_player.js';

export const config = { maxDuration: 60 };

const IOS_UA = 'com.google.ios.youtube/20.11.6 (iPhone10,4; U; CPU iOS 16_7_7 like Mac OS X)';

function parseRange(raw?: string): { start: number; end?: number } | null {
  if (!raw) return null;
  const m = raw.match(/bytes=(\d+)-(\d+)?/);
  if (!m) return null;
  return { start: parseInt(m[1], 10), end: m[2] !== undefined ? parseInt(m[2], 10) : undefined };
}

async function fetchUpstream(url: string, range?: string) {
  const headers: Record<string, string> = {
    'User-Agent': IOS_UA,
    Accept: '*/*',
  };
  if (range) headers.Range = range;
  let upstream = await fetch(url, { headers });
  if (!upstream.ok && upstream.status !== 206) {
    await new Promise((r) => setTimeout(r, 250));
    upstream = await fetch(url, { headers });
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

  let playable;
  try {
    playable = await getPlayableAudio(id);
  } catch (e) {
    console.error('resolve failed', e);
    return res.status(502).json({ error: 'No playable source found' });
  }

  const rawRange = Array.isArray(req.headers.range) ? req.headers.range[0] : req.headers.range;
  const clientRange = parseRange(rawRange);

  try {
    // googlevideo throttles (or 403s) a bare GET, but serves `bytes=0-` quickly.
    // If the browser did not send Range, still fetch the whole object that way
    // and rewrite the response to 200 — <audio> treats an unsolicited 206 as
    // a decode error ("Playback failed").
    const rangeHeader = clientRange
      ? (clientRange.end !== undefined
        ? `bytes=${clientRange.start}-${clientRange.end}`
        : `bytes=${clientRange.start}-`)
      : 'bytes=0-';

    const upstream = await fetchUpstream(playable.url, rangeHeader);

    if (!upstream.ok && upstream.status !== 206) {
      return res.status(502).json({ error: `Upstream ${upstream.status}` });
    }

    res.setHeader('Content-Type', upstream.headers.get('content-type') || playable.mime);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'private, max-age=0');

    const len = upstream.headers.get('content-length');
    const cr = upstream.headers.get('content-range');

    if (!clientRange) {
      // Browser asked for the whole resource. Rewrite 206→200 and drop
      // Content-Range so HTMLAudioElement can decode it.
      res.status(200);
      if (len) res.setHeader('Content-Length', len);
    } else {
      res.status(upstream.status);
      if (len) res.setHeader('Content-Length', len);
      if (cr) res.setHeader('Content-Range', cr);
    }

    await pipeBody(upstream, res);
  } catch (e) {
    console.error('pipe failed', e);
    if (!res.headersSent) {
      return res.status(502).json({ error: 'Stream proxy failed' });
    }
  }
}
