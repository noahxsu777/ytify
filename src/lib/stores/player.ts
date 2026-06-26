import { createRoot } from "solid-js";
import { createStore } from "solid-js/store";
import { addToCollection, config, cssVar, player, themer } from "@lib/utils";
import { navStore, params, updateParam } from "./navigation";
import { addToQueue, queueStore, setQueueStore } from "./queue";
import audioErrorHandler from "@lib/modules/audioErrorHandler";
import { store } from "./app";
import getStreamData from "../modules/getStreamData";

const blankImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

type PlayerStore = {
  stream: CollectionItem,
  history: CollectionItem[],
  audio: HTMLAudioElement,
  context: {
    src: Context,
    id: string
  }
  currentTime: number,
  fullDuration: number,
  playbackRate: number,
  loop: boolean,
  volume: number,
  status: string,
  playbackState: 'none' | 'playing' | 'paused' | 'loading',
  mediaArtwork: string,
  supportsOpus: Promise<boolean>,
  data: {},
  immersive: boolean,
  isMusic: boolean,
  audioURL: string,
  videoURL: string,
  isWatching: boolean,
  lrcSync?: (d: number) => void
};

const createInitialState = (): PlayerStore => ({
  audio: new Audio(),
  playbackState: 'none',
  context: { id: 'query', src: 'link' },
  status: '',
  currentTime: 0,
  fullDuration: 0,
  playbackRate: 1.0,
  loop: false,
  volume: parseFloat(config.volume) / 100,
  stream: {
    title: '',
    author: '',
    authorId: '',
    id: '',
    duration: ''
  },
  history: [],
  mediaArtwork: blankImage,
  supportsOpus: navigator.mediaCapabilities.decodingInfo({
    type: 'file',
    audio: {
      contentType: 'audio/webm;codecs=opus'
    }
  }).then(res => res.supported),
  data: {},
  immersive: false,
  isMusic: true,
  audioURL: '',
  videoURL: '',
  isWatching: Boolean(config.watchMode)
});

const [playerStore, setPlayerStore] = createStore(createInitialState());

export function playNext() {
  const { stream } = playerStore;
  const { list } = queueStore;
  const nextStream = list[0];
  setPlayerStore('history', h => [{ ...stream }, ...h]);
  setPlayerStore('stream', nextStream);
  setQueueStore('list', l => l.slice(1));
  player(nextStream.id);

}

export function playPrev() {
  const { history, stream } = playerStore;

  const prevStream = history[0];
  setPlayerStore('history', h => h.slice(1));
  setQueueStore('list', l => [{ ...stream }, ...l]);

  setPlayerStore('stream', prevStream);
  player(prevStream.id);
}

createRoot(() => {
  let historyID: string | undefined = '';
  let historyTimeoutId = 0;

  // Prefetch: warm the next track ~6s before the current one ends so playback
  // continues without a noticeable loading gap.
  const prefetchAudio = new Audio();
  prefetchAudio.preload = 'auto';
  prefetchAudio.muted = true;
  let prefetchedFor = '';

  playerStore.audio.volume = playerStore.volume;

  playerStore.audio.onended = () => {
    if (queueStore.list.length) {
      playNext();
    } else {
      // Queue is empty — fetch related tracks from Invidious recommendedVideos
      // that were stored on the last loaded track, then play next.
      autoFillAndPlay();
    }
  }

  playerStore.audio.onplaying = () => {
    setPlayerStore('playbackState', 'playing');
    const { stream } = playerStore;
    const { id } = stream;

    if (config.history)
      historyTimeoutId = window.setTimeout(() => {
        if (historyID === id) {
          if (
            config.similarContent
            && playerStore.isMusic
          )
            getRecommendations();
          addToCollection('history', [playerStore.stream]);
        }
      }, 1e4);
  }

  playerStore.audio.onpause = () => {
    setPlayerStore('playbackState', 'paused');
    clearTimeout(historyTimeoutId);
  };
  playerStore.audio.addEventListener('loadeddata', themer);


  let isPlayable = false;
  const playableCheckerID = setInterval(() => {
    if (playerStore.history.length || params.has('url') || params.has('text') || !params.has('s')) {
      isPlayable = true;
      clearInterval(playableCheckerID);
    }
  }, 500);

  playerStore.audio.onloadstart = () => {
    setPlayerStore('playbackState', 'paused');
    setPlayerStore('status', '');
    if (isPlayable) playerStore.audio.play();

    historyID = playerStore.stream.id;
    clearTimeout(historyTimeoutId);
    playerStore.audio.playbackRate = playerStore.playbackRate;
  }

  playerStore.audio.onwaiting = () => {
    setPlayerStore('playbackState', 'loading')
  };

  playerStore.audio.ontimeupdate = () => {
    if (document.activeElement?.matches('input[type="range"]'))
      return;

    const { audio, lrcSync, fullDuration, isMusic } = playerStore;

    // Lyrics
    if (lrcSync)
      lrcSync(audio.currentTime);

    const seconds = Math.floor(audio.currentTime);


    setPlayerStore('currentTime', seconds);

    // Prefetch the next queued track shortly before this one ends
    const remaining = fullDuration - audio.currentTime;
    if (remaining > 0 && remaining <= 6 && queueStore.list.length) {
      const nextId = queueStore.list[0].id;
      if (nextId && prefetchedFor !== nextId) {
        prefetchedFor = nextId;
        // Warm the in-memory stream-data cache (resolves the fastest instance)
        getStreamData(nextId, true).catch(() => { });
        // Warm the stream proxy + buffer the first bytes in the browser
        try {
          prefetchAudio.src = `/api/stream?id=${nextId}`;
          prefetchAudio.load();
        } catch { /* ignore */ }
      }
    }


    // Immersive Mode
    const { ref } = navStore.player;
    if (ref) {
      const { offsetHeight, offsetWidth } = ref;
      const diff = isMusic ? (offsetHeight - offsetWidth) : offsetWidth;
      const scale = seconds / fullDuration;
      const shift = Math.floor(scale * diff);
      cssVar('--player-bp', `-${shift}px 0`);
    }

    const t = params.get('t');

    if (t) {
      if (isMusic) updateParam('t');
      else {
        if (seconds % 5 === 0) {
          const str = seconds.toString();
          if (t !== str)
            updateParam('t', str);
        }
      }
    }


  }

  playerStore.audio.onloadedmetadata = () => {
    setPlayerStore({
      currentTime: 0,
      fullDuration: Math.floor(playerStore.audio.duration)
    });
  }

  playerStore.audio.oncanplaythrough = async function() {
    const nextItem = config.queuePrefetch && queueStore.list[0]?.id;

    if (!nextItem) return;

    const data = await getStreamData(nextItem, true);
    const prefetchRef = new Audio();
    prefetchRef.onerror = () => audioErrorHandler(prefetchRef, nextItem);
    if (data && 'adaptiveFormats' in data)
      import('../modules/setAudioStreams')
        .then(mod => mod.default(
          data.adaptiveFormats
            .filter(f => f.type.startsWith('audio'))
            .sort((a, b) => (parseInt(a.bitrate) - parseInt(b.bitrate))),
          prefetchRef
        ));
  }

  playerStore.audio.onerror = () => audioErrorHandler(playerStore.audio);

});

async function getRecommendations() {
  const title = encodeURIComponent(playerStore.stream.title);
  const artist = encodeURIComponent(playerStore.stream.author?.slice(0, -8) ?? '');
  const apiUrl = store.api
    ? `${store.api}/api/tracks?title=${title}&artist=${artist}&limit=10`
    : null;

  if (apiUrl) {
    fetch(apiUrl)
      .then(res => { if (!res.ok) throw new Error('api'); return res.json(); })
      .then(addToQueue)
      .catch(() => fillFromInvidious());
  } else {
    fillFromInvidious();
  }
}

// Fill queue using the recommendedVideos Invidious already returned for the
// current track (stored in playerStore.data).
function fillFromInvidious() {
  const data = playerStore.data as Invidious;
  if (data?.recommendedVideos?.length) {
    import('../modules/enqueueRelatedStreams')
      .then(mod => mod.default(data.recommendedVideos));
  }
}

// Called when the song ends and queue is empty.
// Tries to get recommendations; if the queue is still empty after a short
// wait, falls back to Invidious related videos and plays the first one.
async function autoFillAndPlay() {
  // First try Invidious related videos (immediate, no network call needed)
  const data = playerStore.data as Invidious;
  if (data?.recommendedVideos?.length) {
    import('../modules/enqueueRelatedStreams')
      .then(mod => {
        mod.default(data.recommendedVideos);
        // Give the store a tick to update then play next
        setTimeout(() => {
          if (queueStore.list.length) playNext();
          else {
            updateParam('s');
            setPlayerStore('playbackState', 'none');
          }
        }, 100);
      });
    return;
  }

  // No Invidious data available
  updateParam('s');
  setPlayerStore('playbackState', 'none');
}


export { playerStore, setPlayerStore };
