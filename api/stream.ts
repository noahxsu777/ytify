import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Readable } from 'node:stream';
import { getInstances } from '../src/backend/instances.js';

const VR_CLIENT = {
  clientName: 'ANDROID_VR', clientVersion: '1.60.19',
  deviceMake: 'Oculus', deviceModel: 'Quest 3',
  androidSdkVersion: 32, osName: 'Android', osVersion: '12', hl: 'en', gl: 'US',
};

// 1. Direct googlevideo via ANDROID_VR (works for many videos). Returns a URL
//    that is IP-locked to THIS server, so the caller must proxy the bytes.
async function viaInnertube(id: string): Promise<string | null> {
  try {
    const r = await fetch('https://youtubei.googleapis.com/youtubei/v1/player', {
      method: 'POST', signal: AbortSignal.timeout(6000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context: { client: VR_CLIENT }, videoId: id, contentCheckOk: true, racyCheckOk: true }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    if (d?.playabilityStatus?.status !== 'OK') return null;
    const audio = (d?.streamingData?.adaptiveFormats || [])
      .filter((f: any) => (f.mimeType || '').startsWith('audio') && f.url)
      .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
    return audio[0]?.url || null;
  } catch { return null; }
}

// 2. Piped — audioStreams URLs are already proxied by the instance, so they
//    play from any IP. Race ALL instances; the FASTEST to answer wins.
async function viaPiped(id: string, PIPED: string[]): Promise<string | null> {
  const probe = (inst: string) =>
    fetch(`${inst}/streams/${id}`, { signal: AbortSignal.timeout(5000) }).then(async r => {
      if (!r.ok) throw new Error(`${r.status}`);
      const d = await r.json();
      const audio = (d.audioStreams || []).sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
      if (audio[0]?.url) return audio[0].url as string;
      throw new Error('no audio');
    });
  try { return await Promise.any(PIPED.map(probe)); } catch { return null; }
}

// 3. Invidious with local=true — proxies audio through the instance, plays
//    cross-IP. Race ALL instances; the FASTEST to answer wins.
async function viaInvidious(id: string, INVIDIOUS: string[]): Promise<string | null> {
  const probe = (inst: string) =>
    fetch(`${inst}/api/v1/videos/${id}?local=true`, { signal: AbortSignal.timeout(5000) }).then(async r => {
      if (!r.ok) throw new Error(`${r.status}`);
      const d = await r.json();
      const audio = (d.adaptiveFormats || [])
        .filter((f: any) => (f.type || '').startsWith('audio'))
        .sort((a: any, b: any) => parseInt(b.bitrate || '0') - parseInt(a.bitrate || '0'));
      let url = audio[0]?.url;
      if (!url) throw new Error('no audio');
      if (url.startsWith('/')) url = inst + url; // make absolute
      return url as string;
    });
  try { return await Promise.any(INVIDIOUS.map(probe)); } catch { return null; }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = req.query.id as string;
  if (!id || !/^[a-zA-Z0-9_-]{11}$/.test(id)) {
    return res.status(400).json({ error: 'Invalid video id' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  const { iv: INVIDIOUS, pi: PIPED } = getInstances();

  // Race Invidious + Piped together — the FASTEST instance to answer wins.
  // Both return instance-proxied URLs that play cross-IP, so we just redirect.
  const proxied = await Promise.any([
    viaInvidious(id, INVIDIOUS).then(u => u ?? Promise.reject(new Error('iv none'))),
    viaPiped(id, PIPED).then(u => u ?? Promise.reject(new Error('pi none'))),
  ]).catch(() => null);
  if (proxied) {
    res.setHeader('Cache-Control', 'no-store');
    return res.redirect(302, proxied);
  }

  // Fall back to ANDROID_VR direct URL — IP-locked, so we must pipe the bytes.
  const direct = await viaInnertube(id);
  if (!direct) {
    return res.status(502).json({ error: 'No playable source found' });
  }

  try {
    const range = req.headers.range;
    const upstream = await fetch(direct, { headers: range ? { Range: range } : {} });
    if (!upstream.ok && upstream.status !== 206) {
      return res.status(502).json({ error: `Upstream ${upstream.status}` });
    }
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'audio/webm');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    const len = upstream.headers.get('content-length');
    if (len) res.setHeader('Content-Length', len);
    const cr = upstream.headers.get('content-range');
    if (cr) res.setHeader('Content-Range', cr);
    if (!upstream.body) return res.end();
    Readable.fromWeb(upstream.body as any).pipe(res);
  } catch {
    return res.status(502).json({ error: 'Stream proxy failed' });
  }
}
