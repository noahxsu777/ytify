import { createSignal, Show } from "solid-js";
import { playerStore, setPlayerStore, navStore, setNavStore } from "@lib/stores";
import { setQueueStore } from "@lib/stores/queue";
import { playNext, playPrev } from "@lib/stores/player";
import { convertSStoHHMMSS, setConfig } from "@lib/utils";
import { LikeButton, PlayButton } from "./MediaPartials";
import Lyrics from "../features/Player/Lyrics";
import './PlayerBar.css';

export default function PlayerBar() {
  const [showLyrics, setShowLyrics] = createSignal(false);
  const [isMuted, setIsMuted] = createSignal(false);
  const [prevVolume, setPrevVolume] = createSignal(1);

  const shuffleQueue = () => {
    setQueueStore('list', list => {
      const shuffled = [...list];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
  };

  const toggleMute = () => {
    if (isMuted()) {
      playerStore.audio.volume = prevVolume();
      setPlayerStore('volume', prevVolume());
      setIsMuted(false);
    } else {
      setPrevVolume(playerStore.volume);
      playerStore.audio.volume = 0;
      setPlayerStore('volume', 0);
      setIsMuted(true);
    }
  };

  return (
    <div class="player-bar">
      <div class="left-controls">
        <div class="artwork-container">
            <img
               src={playerStore.mediaArtwork}
               class="bar-artwork"
               onError={(e) => e.currentTarget.src = '/logo192.png'}
            />
            <button
               class="expand-btn"
               onClick={() => setNavStore('player', 'state', true)}
            >
               <i class="ri-arrow-up-s-line"></i>
            </button>
        </div>
        <div class="track-info">
          <div class="track-title" title={playerStore.stream.title}>
             {playerStore.stream.title || "No Title"}
          </div>
          <div class="track-artist" title={playerStore.stream.author}>
             {playerStore.stream.author?.replace('- Topic', '') || "No Artist"}
          </div>
        </div>
        <LikeButton />
      </div>

      <div class="center-controls">
        <div class="playback-buttons">
          <button
             class="control-btn shuffle"
             title="Shuffle"
             onClick={shuffleQueue}
          >
            <i class="ri-shuffle-line"></i>
          </button>

          <button
             class="control-btn prev"
             title="Previous"
             onClick={playPrev}
          >
            <i class="ri-skip-back-fill"></i>
          </button>

          <div class="play-btn-wrapper">
             <PlayButton />
          </div>

          <button
             class="control-btn next"
             title="Next"
             onClick={playNext}
          >
            <i class="ri-skip-forward-fill"></i>
          </button>

          <button
             class="control-btn repeat"
             title="Repeat"
             classList={{ active: playerStore.loop }}
             onClick={() => {
                const newLoop = !playerStore.loop;
                playerStore.audio.loop = newLoop;
                setPlayerStore('loop', newLoop);
             }}
          >
            <i class="ri-repeat-line"></i>
          </button>
        </div>

        <div class="progress-container">
          <span class="time">{convertSStoHHMMSS(playerStore.currentTime)}</span>
          <div class="slider-wrapper">
             <input
                type="range"
                min="0"
                max={playerStore.fullDuration || 100}
                value={playerStore.currentTime}
                class="seek-slider"
                onInput={(e) => {
                   playerStore.audio.currentTime = parseFloat(e.currentTarget.value);
                }}
             />
             <div
                class="progress-fill"
                style={{ width: `${(playerStore.currentTime / (playerStore.fullDuration || 1)) * 100}%` }}
             ></div>
          </div>
          <span class="time">{convertSStoHHMMSS(playerStore.fullDuration)}</span>
        </div>
      </div>

      <div class="right-controls">
         <button
            class="control-btn lyrics-btn"
            classList={{ active: showLyrics() }}
            onClick={() => setShowLyrics(!showLyrics())}
            title="Lyrics"
         >
            <i class="ri-mic-line"></i>
         </button>

         <button
            class="control-btn queue-btn"
            classList={{ active: navStore.queue.state }}
            onClick={() => setNavStore('queue', 'state', !navStore.queue.state)}
            title="Queue"
         >
            <i class="ri-play-list-line"></i>
         </button>

         <div class="volume-container">
            <button class="control-btn volume-btn" onClick={toggleMute}>
               <i class={isMuted() || playerStore.volume === 0 ? "ri-volume-mute-line" : "ri-volume-up-line"}></i>
            </button>
            <input
               type="range"
               min="0"
               max="1"
               step="0.01"
               value={playerStore.volume}
               class="volume-slider"
               onInput={(e) => {
                  const val = parseFloat(e.currentTarget.value);
                  playerStore.audio.volume = val;
                  setPlayerStore('volume', val);
                  setConfig('volume', (val * 100).toString());
                  setIsMuted(val === 0);
               }}
            />
         </div>
      </div>

      <Show when={showLyrics()}>
        <div class="lyrics-overlay">
           <div class="lyrics-header">
              <h3>Lyrics</h3>
              <button onClick={() => setShowLyrics(false)}><i class="ri-close-line"></i></button>
           </div>
           <Lyrics onClose={() => setShowLyrics(false)} />
        </div>
      </Show>
    </div>
  );
}
