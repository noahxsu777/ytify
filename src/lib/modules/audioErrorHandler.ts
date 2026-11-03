import { playerStore, setPlayerStore } from '@lib/stores/player.ts';
import { setStore } from '@lib/stores/app';

const attempts = new Map<string, number>();
const SOURCES = ['auto', 'piped', 'iv'] as const;

export default function(
  audio: HTMLAudioElement,
  prefetch = ''
) {
  const { stream } = playerStore;
  const id = prefetch || stream.id;
  if (!id) return;

  // A glitch on a later byte-range must not kill a track that's already playing.
  if (!prefetch && (audio.currentTime > 0.5 || playerStore.playbackState === 'playing')) {
    return;
  }

  const n = attempts.get(id) || 0;
  if (prefetch) return;
  if (n >= SOURCES.length) {
    setPlayerStore('playbackState', 'paused');
    setPlayerStore('status', 'Audio unavailable');
    setStore('snackbar', 'Audio unavailable. Please try another track or try again later.');
    return;
  }
  attempts.set(id, n + 1);
  const src = SOURCES[n % SOURCES.length];
  const delay = n >= SOURCES.length ? 600 : 0;

  audio.pause();
  if (!prefetch) {
    setPlayerStore('playbackState', 'loading');
    setPlayerStore('status', 'Trying another source...');
  }

  const next = () => {
    if (!prefetch && playerStore.stream.id !== id) return;
    audio.src = `/api/stream?id=${id}&src=${src}&t=${Date.now()}`;
    audio.load();
    audio.play().catch(() => {});
  };

  if (delay) setTimeout(next, delay);
  else next();
}

export function clearStreamRetry(id: string) {
  attempts.delete(id);
}
