import { playerStore, setPlayerStore, t } from "@lib/stores";
import { handleXtags, preferredStream, proxyHandler } from "@lib/utils";

export default async function(
  audioStreams: AudioStream[],
  prefetchNode?: HTMLAudioElement
) {

  const noOfBitrates = audioStreams.length;

  if (!noOfBitrates) {
    setPlayerStore('status', t('player_audiostreams_null'));
    setPlayerStore('playbackState', 'none');
    return;
  }

  const id = playerStore.stream.id;
  const audio = prefetchNode || playerStore.audio;
  // Don't interrupt an already-loading same-origin stream with the same URL.
  if (!prefetchNode && id && audio.src.includes('/api/stream') && audio.src.includes(id))
    return;

  if (!prefetchNode)
    setPlayerStore('status', t('player_audiostreams_setup'));

  const sameOrigin = id ? `/api/stream?id=${id}` : '';
  const stream = await preferredStream(handleXtags(audioStreams));
  const url = sameOrigin || stream?.url;
  if (!url) {
    setPlayerStore('status', t('player_audiostreams_null'));
    setPlayerStore('playbackState', 'none');
    return;
  }
  audio.src = proxyHandler(url, Boolean(prefetchNode));

}
