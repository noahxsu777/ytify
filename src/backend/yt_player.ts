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

  throw new Error(lastErr);
}
