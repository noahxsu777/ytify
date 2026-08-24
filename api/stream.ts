import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Readable } from 'node:stream';
import { getInstances } from '../src/backend/instances.js';

export const config = { maxDuration: 60 };

const VR_CLIENT = {
  clientName: 'ANDROID_VR', clientVersion: '1.60.19',
  deviceMake: 'Oculus', deviceModel: 'Quest 3',
  androidSdkVersion: 32, osName: 'Android', osVersion: '12', hl: 'en', gl: 'US',
};

function pickAudio(formats: any[]): any | null {
  const audio = (formats || []).filter((f: any) =>
    (f.mimeType || f.type || '').startsWith('audio') && f.url
  );
  if (!audio.length) return null;
  audio.sort((a: any, b: any) => {
    const rank = (f: any) => {
      const mime = `${f.mimeType || ''} ${f.type || ''}`;
      const lc = /mp4a\.40\.2|mp4a.40.2/i.test(mime) ? 3 : 0;
      const aac = /mp4|mp4a|aac/i.test(mime) ? 2 : 0;
      return lc + aac + (Number(f.bitrate) || 0) / 1e6;
    };
    return rank(b) - rank(a);
  });
  return audio[0];
}

const playerCache = new Map<string, { url: string; mime: string; ts: number }>();

async function viaInnertube(id: string): Promise<{ url: string; mime: string } | null> {
  const hit = playerCache.get(id);
  if (hit && Date.now() - hit.ts < 4 * 60 * 1000) return hit;
  try {
    const r = await fetch('https://youtubei.googleapis.com/youtubei/v1/player', {
      method: 'POST',
      signal: AbortSignal.timeout(5000),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'com.google.android.apps.youtube.vr/1.60.19 (Linux; U; Android 12; Quest 3) gzip',
      },
      body: JSON.stringify({
        context: { client: VR_CLIENT },
        videoId: id,
        contentCheckOk: true,
        racyCheckOk: true,
      }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    if (d?.playabilityStatus?.status && d.playabilityStatus.status !== 'OK') return null;
    const picked = pickAudio(d?.streamingData?.adaptiveFormats || []);
    if (!picked?.url) return null;
    const out = { url: picked.url, mime: picked.mimeType || 'audio/mp4', ts: Date.now() };
    playerCache.set(id, out);
    return out;
  } catch {
    return null;
  }
}

async function viaPiped(id: string, PIPED: string[]): Promise<string | null> {
  const probe = (inst: string) =>
    fetch(`${inst}/streams/${id}`, { signal: AbortSignal.timeout(2000) }).then(async r => {
      if (!r.ok) throw new Error(`${r.status}`);
      const d = await r.json();
      const picked = pickAudio(d.audioStreams || []);
      if (picked?.url) return picked.url as string;
      throw new Error('no audio');
    });
  try { return await Promise.any(PIPED.map(probe)); } catch { return null; }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = req.query.id as string;
  if (!id || !/^[a-zA-Z0-9_-]{11}$/.test(id)) {
    return res.status(400).json({ error: 'Invalid video id' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Range');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');

  // InnerTube first — public Piped/Invidious instances are often empty or down.
  // googlevideo URLs are IP-locked to this server, so we pipe bytes (Range-aware).
  const direct = await viaInnertube(id);
  if (direct) {
    try {
      const range = req.headers.range;
      const upstream = await fetch(direct.url, {
        headers: {
          ...(range ? { Range: range } : {}),
          'User-Agent': 'Mozilla/5.0',
        },
      });
      if (!upstream.ok && upstream.status !== 206) {
        throw new Error(`Upstream ${upstream.status}`);
      }
      res.status(upstream.status);
      res.setHeader('Content-Type', upstream.headers.get('content-type') || direct.mime);
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
      return;
    } catch (e) {
      console.error('InnerTube pipe failed', e);
      // fall through to Piped redirect
    }
  }

  const { pi: PIPED } = getInstances();
  const proxied = await viaPiped(id, PIPED);
  if (proxied) {
    res.setHeader('Cache-Control', 'no-store');
    return res.redirect(302, proxied);
  }

  return res.status(502).json({ error: 'No playable source found' });
}
