import { spawn } from 'node:child_process';
import { chmod, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Innertube } from 'youtubei.js';

export type Playable = {
  url: string;
  mime: string;
  title: string;
  author: string;
  authorId: string;
  lengthSeconds: number;
  itag: number;
  source: 'youtubei' | 'yt-dlp';
};

const cache = new Map<string, { data: Playable; ts: number }>();
const TTL = 4 * 60 * 1000;

let tube: Innertube | null = null;
let creating: Promise<Innertube> | null = null;

async function getTube(): Promise<Innertube> {
  if (tube) return tube;
  if (!creating) {
    creating = Innertube.create({
      generate_session_locally: true,
      retrieve_player: false,
    }).then((t) => {
      tube = t;
      return t;
    }).finally(() => {
      creating = null;
    });
  }
  return creating;
}

function pickAudio(formats: any[]) {
  const audio = formats.filter((f) =>
    String(f.mime_type || f.mimeType || '').startsWith('audio') && f.url
  );
  audio.sort((a, b) => {
    const rank = (f: any) => {
      const mime = String(f.mime_type || f.mimeType || '');
      const lc = /mp4a\.40\.2/i.test(mime) ? 4 : 0;
      const aac = /mp4|mp4a|aac/i.test(mime) ? 2 : 0;
      const itag140 = f.itag === 140 ? 1 : 0;
      return lc + aac + itag140 + (Number(f.bitrate) || 0) / 1e6;
    };
    return rank(b) - rank(a);
  });
  return audio[0];
}

async function viaYoutubei(id: string): Promise<Playable> {
  const yt = await getTube();
  let lastErr = 'youtubei unplayable';
  for (const client of ['IOS', 'ANDROID_VR'] as const) {
    try {
      const info = await yt.getBasicInfo(id, { client });
      const status = info.playability_status?.status;
      if (status && status !== 'OK') {
        lastErr = info.playability_status?.reason || status;
        continue;
      }
      const fmt = pickAudio(info.streaming_data?.adaptive_formats || []);
      if (!fmt?.url) {
        lastErr = 'youtubei no audio url';
        continue;
      }
      return {
        url: fmt.url,
        mime: fmt.mime_type || 'audio/mp4',
        title: info.basic_info?.title || '',
        author: info.basic_info?.author || '',
        authorId: info.basic_info?.channel_id || '',
        lengthSeconds: Math.round(Number(info.basic_info?.duration) || 0),
        itag: fmt.itag || 140,
        source: 'youtubei',
      };
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
  }
  throw new Error(lastErr);
}

function ytdlpAsset(): string {
  if (process.platform === 'darwin') return 'yt-dlp_macos';
  if (process.platform === 'win32') return 'yt-dlp.exe';
  return 'yt-dlp_linux';
}

function ytdlpPath(): string {
  const name = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp-standalone';
  return path.join(os.tmpdir(), name);
}

async function ensureYtdlp(): Promise<string> {
  const dest = ytdlpPath();
  if (existsSync(dest)) return dest;
  const url = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${ytdlpAsset()}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!r.ok) throw new Error(`yt-dlp download ${r.status}`);
  await writeFile(dest, Buffer.from(await r.arrayBuffer()));
  if (process.platform !== 'win32') await chmod(dest, 0o755);
  return dest;
}

const ytdlpWarm = ensureYtdlp().catch(() => '');

function viaYtdlp(id: string, signal: AbortSignal): Promise<Playable> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error('aborted'));
      return;
    }
    Promise.resolve(ytdlpWarm).then((warm) => warm || ensureYtdlp()).then((bin) => {
      if (!bin) throw new Error('yt-dlp missing');
      if (signal.aborted) {
        reject(new Error('aborted'));
        return;
      }
      const child = spawn(bin, [
        '-f', 'bestaudio[ext=m4a]/bestaudio',
        '-g',
        '--no-warnings',
        '--no-playlist',
        '--no-check-certificates',
        `https://www.youtube.com/watch?v=${id}`,
      ], { stdio: ['ignore', 'pipe', 'pipe'] });

      const onAbort = () => {
        try { child.kill('SIGTERM'); } catch { /* ignore */ }
      };
      signal.addEventListener('abort', onAbort, { once: true });

      let out = '';
      let err = '';
      child.stdout.on('data', (d) => { out += d; });
      child.stderr.on('data', (d) => { err += d; });
      child.on('error', (e) => {
        signal.removeEventListener('abort', onAbort);
        reject(e);
      });
      child.on('close', (code) => {
        signal.removeEventListener('abort', onAbort);
        const url = out.trim().split('\n').map((l) => l.trim()).filter((l) => l.startsWith('http')).pop();
        if (code === 0 && url) {
          resolve({
            url,
            mime: /mime=audio%2Fwebm|mime=audio\/webm/.test(url) ? 'audio/webm' : 'audio/mp4',
            title: '',
            author: '',
            authorId: '',
            lengthSeconds: 0,
            itag: 140,
            source: 'yt-dlp',
          });
          return;
        }
        reject(new Error(err.trim().split('\n').pop() || `yt-dlp exit ${code}`));
      });
    }).catch(reject);
  });
}

export async function getPlayableAudio(id: string): Promise<Playable> {
  const hit = cache.get(id);
  if (hit && Date.now() - hit.ts < TTL) return hit.data;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 15000);
  try {
    const data = await Promise.any([
      viaYoutubei(id),
      viaYtdlp(id, ac.signal),
    ]);
    ac.abort();
    cache.set(id, { data, ts: Date.now() });
    return data;
  } catch (e) {
    const msg = e instanceof AggregateError
      ? e.errors.map((err) => (err instanceof Error ? err.message : String(err))).join('; ')
      : e instanceof Error ? e.message : String(e);
    throw new Error(msg);
  } finally {
    clearTimeout(timer);
  }
}

export function forgetPlayable(id: string) {
  cache.delete(id);
}
