import { playerStore, setPlayerStore } from '@lib/stores/player.ts';

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
  attempts.set(id, n + 1);
  const src = SOURCES[n % SOURCES.length];
  const delay = n >= SOURCES.length ? 600 : 0;

  audio.pause();
  if (!prefetch) {
    setPlayerStore('playbackState', 'loading');
    setPlayerStore('status', 'Trying another source...');
  }

  const next = () => {
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
