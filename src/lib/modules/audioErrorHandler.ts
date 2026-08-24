import { setStore } from '@lib/stores/app.ts';
import { playerStore, setPlayerStore } from '@lib/stores/player.ts';

const retried = new Set<string>();

export default function(
  audio: HTMLAudioElement,
  prefetch = ''
) {
  const { stream } = playerStore;
  const id = prefetch || stream.id;
  if (!id) return;

  // A 403/502 on a later byte-range must not kill a track that's already playing.
  if (!prefetch && (audio.currentTime > 0.5 || playerStore.playbackState === 'playing')) {
    return;
  }

  audio.pause();

  const fallbackSrc = `/api/stream?id=${id}&t=${Date.now()}`;

  if (!retried.has(id) && audio.src.includes('/api/stream')) {
    retried.add(id);
    if (!prefetch)
      setPlayerStore('status', 'Retrying stream...');
    audio.src = fallbackSrc;
    audio.load();
    audio.play().catch(() => {});
    return;
  }

  if (audio.src.includes('/api/stream') && retried.has(id)) {
    if (!prefetch) {
      setPlayerStore({
        playbackState: 'none',
        status: 'Playback failed',
      });
      setStore('snackbar', 'Could not play this track. Try another.');
    }
    return;
  }

  if (!prefetch)
    setPlayerStore('status', 'Finding a faster source...');

  setStore('index', 0);
  retried.add(id);
  audio.src = fallbackSrc;
  audio.load();
  audio.play().catch(() => {});
}

export function clearStreamRetry(id: string) {
  retried.delete(id);
}
