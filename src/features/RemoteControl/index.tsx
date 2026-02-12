import { onMount, onCleanup } from 'solid-js';
import { io } from 'socket.io-client';
import { playerStore, playNext, playPrev } from '@lib/stores/player';
import { player } from '@lib/utils/player';
import { addToQueue } from '@lib/stores/queue';
import { setStore } from '@lib/stores/app';
import fetchYTMusicSearchResults from '@lib/modules/fetchYTMusicSearchResults';

export default function RemoteControl() {
  onMount(() => {
    // Determine the server URL.
    // In dev, Vite is on port 3000/5173, Server is on 3001.
    // In prod, we default to http://localhost:3001 as this is a local remote control tool,
    // unless configured otherwise via VITE_API_URL.
    const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

    console.log('Initializing Remote Control connection to:', socketUrl);
    const socket = io(socketUrl);

    socket.on('connect', () => {
      console.log('Connected to Remote Control Server');
      setStore('snackbar', 'Remote Control Connected');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from Remote Control Server');
    });

    socket.on('play', async (data: { query: string }) => {
      console.log('Remote Play Command:', data.query);
      setStore('snackbar', `Remote: Searching for "${data.query}"...`);

      try {
        const results = await fetchYTMusicSearchResults(data.query);
        // Find the first streamable item (has 'id' and type 'stream' or 'video')
        const firstStream = results.find(item => 'id' in item && (item.type === 'stream' || item.type === 'video')) as YTStreamItem | undefined;

        if (firstStream && firstStream.id) {
           setStore('snackbar', `Remote: Playing ${firstStream.title}`);
           player(firstStream.id);
        } else {
           setStore('snackbar', `Remote: No results for "${data.query}"`);
        }
      } catch (e: any) {
        console.error('Remote Play Error:', e);
        setStore('snackbar', `Remote Error: ${e?.message || 'Unknown error'}`);
      }
    });

    socket.on('queue', async (data: { query: string }) => {
      console.log('Remote Queue Command:', data.query);
      setStore('snackbar', `Remote: Queuing "${data.query}"...`);

      try {
        const results = await fetchYTMusicSearchResults(data.query);
        const firstStream = results.find(item => 'id' in item && (item.type === 'stream' || item.type === 'video')) as YTStreamItem | undefined;

        if (firstStream && firstStream.id) {
           addToQueue([firstStream]);
           setStore('snackbar', `Remote: Queued ${firstStream.title}`);
        } else {
           setStore('snackbar', `Remote: No results for "${data.query}"`);
        }
      } catch (e: any) {
        console.error('Remote Queue Error:', e);
        setStore('snackbar', `Remote Error: ${e?.message || 'Unknown error'}`);
      }
    });

    socket.on('pause', () => {
      if (playerStore.playbackState === 'playing') {
        playerStore.audio.pause();
        setStore('snackbar', 'Remote: Paused');
      } else {
        playerStore.audio.play();
        setStore('snackbar', 'Remote: Resumed');
      }
    });

    socket.on('next', () => {
      playNext();
      setStore('snackbar', 'Remote: Skipped to Next');
    });

    socket.on('prev', () => {
      playPrev();
      setStore('snackbar', 'Remote: Skipped to Previous');
    });

    onCleanup(() => {
      socket.disconnect();
    });
  });

  return null;
}
