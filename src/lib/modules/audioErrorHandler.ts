import { setStore } from '@lib/stores/app.ts';
import { playerStore, setPlayerStore } from '@lib/stores/player.ts';

export default function(
  audio: HTMLAudioElement,
  prefetch = ''
) {
  audio.pause();

  const { stream } = playerStore;
  const id = prefetch || stream.id;
  if (!id) return;

  const fallbackSrc = `/api/stream?id=${id}`;

  // The old handler swapped the URL's origin between Invidious instances one
  // at a time, which no longer matches how streams are resolved (the server
  // hands back a fully-formed, instance-proxied URL) and just produced a long
  // chain of broken URLs — the "stuck on Loading Audio..." stall.
  //
  // Now: on failure go straight to our own /api/stream endpoint, which does
  // the full multi-source resolution server-side in one shot. If that also
  // fails, stop instead of looping.
  if (audio.src.includes('/api/stream')) {
    if (!prefetch) {
      setPlayerStore({
        playbackState: 'none',
        status: 'Playback failed',
      });
      setStore('snackbar', 'Could not play this track');
    }
    return;
  }

  if (!prefetch)
    setPlayerStore('status', 'Finding a faster source...');

  setStore('index', 0);
  audio.src = fallbackSrc;
  audio.load();
}
