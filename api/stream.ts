import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Readable } from 'node:stream';
import { getPlayableAudio } from '../src/backend/yt_player.js';

export const config = { maxDuration: 60 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

  try {
    // googlevideo 403s full-file and open-ended `bytes=0-` requests.
    // Always send a bounded Range, even if the browser didn't.
    const CHUNK = 512 * 1024;
    const rawRange = Array.isArray(req.headers.range) ? req.headers.range[0] : req.headers.range;
    const m = rawRange?.match(/bytes=(\d+)-(\d+)?/);
    const start = m ? parseInt(m[1], 10) : 0;
    const end = m?.[2] ? parseInt(m[2], 10) : start + CHUNK - 1;
    const boundedRange = `bytes=${start}-${end}`;

    const headers = {
      Range: boundedRange,
      'User-Agent': 'com.google.ios.youtube/20.11.6 (iPhone10,4; U; CPU iOS 16_7_7 like Mac OS X)',
      'Accept': '*/*' as const,
    };
    let upstream = await fetch(playable.url, { headers });
    if (!upstream.ok && upstream.status !== 206) {
      await new Promise((r) => setTimeout(r, 250));
      upstream = await fetch(playable.url, { headers });
    }
    if (!upstream.ok && upstream.status !== 206) {
      return res.status(502).json({ error: `Upstream ${upstream.status}` });
    }
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || playable.mime);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'private, max-age=0');
    const len = upstream.headers.get('content-length');
    if (len) res.setHeader('Content-Length', len);
    const cr = upstream.headers.get('content-range');
    if (cr) res.setHeader('Content-Range', cr);
    if (!upstream.body) return res.end();
    const nodeStream = Readable.fromWeb(upstream.body as any);
    await new Promise<void>((resolve, reject) => {
      nodeStream.on('error', reject);
      res.on('close', () => { nodeStream.destroy(); resolve(); });
      res.on('finish', () => resolve());
      nodeStream.pipe(res);
    });
  } catch (e) {
    console.error('pipe failed', e);
    if (!res.headersSent) {
      return res.status(502).json({ error: 'Stream proxy failed' });
    }
  }
}
