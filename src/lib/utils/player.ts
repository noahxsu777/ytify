import { convertSStoHHMMSS } from "./helpers";
import { playerStore, setPlayerStore, setStore, store } from "@lib/stores";
import { config } from "./config";
import getStreamData from "../modules/getStreamData";

let playerAbortController: AbortController;
export async function player(id?: string, isRetry = false) {

  if (playerAbortController)
    playerAbortController.abort();

  playerAbortController = new AbortController();

  if (!id) return;

  const enforceVideo = !playerStore.isMusic && playerStore.isWatching;

  if (!enforceVideo)
    setPlayerStore({
      playbackState: 'loading',
      status: 'Loading Audio...'
    });

  if (!store.invidious.length)
    setStore('snackbar', 'No Instances are Available');

  const data = await getStreamData(id, false, playerAbortController.signal);

  if (!isRetry)
    setStore('index', 0);

  if (data && 'adaptiveFormats' in data)
    setPlayerStore({
      data,
      fullDuration: data.lengthSeconds
    });
  else {
    // Still try the same-origin stream — don't show Playback failed.
    if (!enforceVideo) {
      const audio = playerStore.audio;
      audio.src = `/api/stream?id=${id}&t=${Date.now()}`;
      audio.load();
      audio.play().catch(() => {});
    }
    return;
  }

  const invidiousData = data as Invidious;

  await import('../modules/setMetadata')
    .then(mod => mod.default({
      id,
      title: invidiousData.title,
      author: invidiousData.author,
      duration: convertSStoHHMMSS(invidiousData.lengthSeconds),
      authorId: invidiousData.authorId
    }));

  import('../modules/setAudioStreams')
    .then(mod => mod.default(
      invidiousData.adaptiveFormats
        .filter(f => f.type.startsWith('audio'))
        .sort((a, b) => (parseInt(a.bitrate) - parseInt(b.bitrate)))
    ));

    if (!enforceVideo)
      import('../modules/enqueueRelatedStreams')
        .then(mod => mod.default(invidiousData.recommendedVideos));

  if (config.discover)
    import('../modules/setDiscoveries')
      .then(mod => {
        setTimeout(() => {
          mod.default(id, invidiousData.recommendedVideos);
        }, 1e5);
      });

}
