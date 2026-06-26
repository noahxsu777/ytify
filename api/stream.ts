import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Readable } from 'node:stream';

// ANDROID_VR client returns direct, un-ciphered googlevideo URLs
const CLIENT = {
  clientName: 'ANDROID_VR',
  clientVersion: '1.60.19',
  deviceMake: 'Oculus',
  deviceModel: 'Quest 3',
  androidSdkVersion: 32,
  osName: 'Android',
  osVersion: '12',
  hl: 'en', gl: 'US',
};

async function resolveUrl(id: string, itag?: string): Promise<string | null> {
  const r = await fetch('https://youtubei.googleapis.com/youtubei/v1/player', {
    method: 'POST',
    signal: AbortSignal.timeout(7000),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context: { client: CLIENT }, videoId: id, contentCheckOk: true, racyCheckOk: true }),
  });
  if (!r.ok) return null;
  const d = await r.json();
  const fmts: any[] = d?.streamingData?.adaptiveFormats || [];
  if (!fmts.length) return null;

  if (itag) {
    const exact = fmts.find(f => String(f.itag) === String(itag) && f.url);
    if (exact) return exact.url;
  }
  // Fallback: best audio-only format
  const audio = fmts
    .filter(f => (f.mimeType || '').startsWith('audio') && f.url)
    .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
  return audio[0]?.url || fmts.find(f => f.url)?.url || null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = req.query.id as string;
  const itag = req.query.itag as string | undefined;

  if (!id || !/^[a-zA-Z0-9_-]{11}$/.test(id)) {
    return res.status(400).json({ error: 'Invalid video id' });
  }

  try {
    // Resolve the fresh, IP-locked URL inside THIS invocation so the
    // outbound fetch below shares the same egress IP (no 403).
    const url = await resolveUrl(id, itag);
    if (!url) return res.status(502).json({ error: 'Could not resolve stream' });

    const range = req.headers.range;
    const upstream = await fetch(url, {
      headers: range ? { Range: range } : {},
    });

    if (!upstream.ok && upstream.status !== 206) {
      return res.status(502).json({ error: `Upstream ${upstream.status}` });
    }

    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'audio/webm');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    const len = upstream.headers.get('content-length');
    if (len) res.setHeader('Content-Length', len);
    const cr = upstream.headers.get('content-range');
    if (cr) res.setHeader('Content-Range', cr);

    if (!upstream.body) {
      return res.end();
    }

    // Stream bytes chunk-by-chunk (avoids the serverless response size cap)
    Readable.fromWeb(upstream.body as any).pipe(res);
  } catch (e) {
    return res.status(502).json({ error: 'Stream proxy failed' });
  }
}
