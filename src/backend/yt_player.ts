import { Innertube } from 'youtubei.js';

export type Playable = {
  url: string;
  mime: string;
  title: string;
  author: string;
  authorId: string;
  lengthSeconds: number;
  itag: number;
};

let tube: Innertube | null = null;
let creating: Promise<Innertube> | null = null;
const cache = new Map<string, { data: Playable; ts: number }>();
const TTL = 4 * 60 * 1000;

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
  const audio = formats.filter((f) => (f.mime_type || '').startsWith('audio') && f.url);
  audio.sort((a, b) => {
    const rank = (f: typeof a) => {
      const mime = f.mime_type || '';
      const lc = /mp4a\.40\.2/i.test(mime) ? 4 : 0;
      const aac = /mp4|mp4a|aac/i.test(mime) ? 2 : 0;
      const itag140 = f.itag === 140 ? 1 : 0;
      return lc + aac + itag140 + (f.bitrate || 0) / 1e6;
    };
    return rank(b) - rank(a);
  });
  return audio[0];
}

export async function getPlayableAudio(id: string): Promise<Playable> {
  const hit = cache.get(id);
  if (hit && Date.now() - hit.ts < TTL) return hit.data;

  const yt = await getTube();
  const clients = ['IOS', 'ANDROID_VR'] as const;
  let lastErr = 'unplayable';

  for (const client of clients) {
    try {
      const info = await yt.getBasicInfo(id, { client });
      const status = info.playability_status?.status;
      if (status && status !== 'OK') {
        lastErr = info.playability_status?.reason || status;
        continue;
      }
      const fmt = pickAudio(info.streaming_data?.adaptive_formats || []);
      if (!fmt?.url) {
        lastErr = 'no audio url';
        continue;
      }
      const data: Playable = {
        url: fmt.url,
        mime: fmt.mime_type || 'audio/mp4',
        title: info.basic_info?.title || '',
        author: info.basic_info?.author || '',
        authorId: info.basic_info?.channel_id || '',
        lengthSeconds: Math.round(Number(info.basic_info?.duration) || 0),
        itag: fmt.itag || 140,
      };
      cache.set(id, { data, ts: Date.now() });
      return data;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
  }

  // Second option: raw ANDROID_VR InnerTube (the path that worked before youtubei.js)
  try {
    const r = await fetch('https://youtubei.googleapis.com/youtubei/v1/player', {
      method: 'POST',
      signal: AbortSignal.timeout(5000),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'com.google.android.apps.youtube.vr/1.60.19 (Linux; U; Android 12; Quest 3) gzip',
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'ANDROID_VR',
            clientVersion: '1.60.19',
            deviceMake: 'Oculus',
            deviceModel: 'Quest 3',
            androidSdkVersion: 32,
            osName: 'Android',
            osVersion: '12',
            hl: 'en',
            gl: 'US',
          },
        },
        videoId: id,
        contentCheckOk: true,
        racyCheckOk: true,
      }),
    });
    if (r.ok) {
      const d = await r.json();
      const fmt = pickAudio(
        (d?.streamingData?.adaptiveFormats || []).map((f: any) => ({
          ...f,
          mime_type: f.mimeType || f.mime_type,
        }))
      );
      if (fmt?.url) {
        const data: Playable = {
          url: fmt.url,
          mime: fmt.mime_type || 'audio/mp4',
          title: d?.videoDetails?.title || '',
          author: d?.videoDetails?.author || '',
          authorId: d?.videoDetails?.channelId || '',
          lengthSeconds: parseInt(d?.videoDetails?.lengthSeconds || '0', 10),
          itag: fmt.itag || 140,
        };
        cache.set(id, { data, ts: Date.now() });
        return data;
      }
    }
  } catch { /* fall through */ }

  throw new Error(lastErr);
}

export function forgetPlayable(id: string) {
  cache.delete(id);
}
