import { playerStore, setPlayerStore, t } from "@lib/stores";
import { proxyHandler } from "@lib/utils";

export default async function(
  audioStreams: AudioStream[],
  prefetchNode?: HTMLAudioElement
) {

  if (!prefetchNode)
    setPlayerStore('status', t('player_audiostreams_setup'));

  const id = playerStore.stream.id;
  const audio = prefetchNode || playerStore.audio;

  if (!audioStreams.length) {
    if (id) {
      audio.src = `/api/stream?id=${id}`;
      if (!prefetchNode) {
        audio.load();
        audio.play().catch(() => {});
      }
    }
    return;
  }

  const url = id ? `/api/stream?id=${id}` : '';
  if (!url) return;
  audio.src = proxyHandler(url, Boolean(prefetchNode));
  if (!prefetchNode) {
    audio.load();
    audio.play().catch(() => {});
  }
}
