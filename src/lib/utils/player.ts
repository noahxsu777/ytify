import { convertSStoHHMMSS } from "./helpers";
import { playerStore, setPlayerStore, setStore, store } from "@lib/stores";
import { config } from "./config";
import { generateImageUrl } from "./image";
import getStreamData from "../modules/getStreamData";
import { clearStreamRetry } from "../modules/audioErrorHandler";

let playerAbortController: AbortController;
export async function player(id?: string, isRetry = false) {
  playerAbortController?.abort();
  if (!id) return;

  clearStreamRetry(id);
  const controller = new AbortController();
  playerAbortController = controller;
  const enforceVideo = !playerStore.isMusic && playerStore.isWatching;

  if (!isRetry) setStore('index', 0);
  if (!store.invidious.length) setStore('snackbar', 'No Instances are Available');

  // Start the audio request during the user's tap. Metadata and recommendations
  // arrive independently and never restart an already loading/playing stream.
  if (!enforceVideo) {
    if (playerStore.stream.id !== id) {
      setPlayerStore('stream', { id, title: '', author: '', authorId: '', duration: '' });
    }
    if (config.loadImage) setPlayerStore('mediaArtwork', generateImageUrl(id, 'hq', playerStore.stream.author?.endsWith('- Topic')));
    setPlayerStore({ playbackState: 'loading', status: 'Loading Audio...', currentTime: 0, fullDuration: 0 });
    const audio = playerStore.audio;
    audio.src = `/api/stream?id=${encodeURIComponent(id)}`;
    audio.load();
    audio.play().catch(() => {});
  }

  const data = await getStreamData(id, false, controller.signal);
  // A slower response for the previous song must never replace the new song.
  if (controller.signal.aborted || playerStore.stream.id !== id) return;
  if (!data || !('adaptiveFormats' in data)) return;

  const invidiousData = data as Invidious;
  // Prefer the fast browser-to-Invidious stream if it resolves before the
  // same-origin source has started; do not interrupt audio already playing.
  if (!enforceVideo && playerStore.playbackState === 'loading' && playerStore.audio.currentTime === 0) {
    const audio = playerStore.audio;
    const formats = invidiousData.adaptiveFormats.filter(f => f.type?.startsWith('audio') && f.url && audio.canPlayType(f.type));
    formats.sort ( (a, b) => Number(b.bitrate || 0) - Number(a.bitrate || 0));
    if (formats[0]) {
      audio.src = formats[0].url;
      audio.load();
      audio.play().catch(() => {});
    }
  }
  setPlayerStore('data', data);
  if (invidiousData.lengthSeconds > 0) setPlayerStore('fullDuration', invidiousData.lengthSeconds);

  // The local stream fallback has no metadata; preserve the known track details.
  if (invidiousData.title) {
    const setMetadata = await import('../modules/setMetadata');
    if (controller.signal.aborted || playerStore.stream.id !== id) return;
    await setMetadata.default({
      id,
      title: invidiousData.title,
      author: invidiousData.author,
      duration: convertSStoHHMMSS(invidiousData.lengthSeconds),
      authorId: invidiousData.authorId
    });
  }

  if (!enforceVideo)
    import('../modules/enqueueRelatedStreams')
      .then(mod => { if (!controller.signal.aborted) mod.default(invidiousData.recommendedVideos); });

  if (config.discover)
    import('../modules/setDiscoveries').then(mod => {
      setTimeout(() => { if (!controller.signal.aborted) mod.default(id, invidiousData.recommendedVideos); }, 1e5);
    });
}
