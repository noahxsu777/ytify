import { LikeButton, PlayButton, PlayNextButton } from "@components/MediaPartials";
import { params, playerStore, playPrev, setPlayerStore, t } from "@lib/stores";
import { convertSStoHHMMSS, setConfig } from "@lib/utils";
import { Accessor, createSignal, onMount, Setter } from "solid-js";

export default function(_: {
  showLyrics: Accessor<boolean>,
  setShowLyrics: Setter<boolean>
}) {
  const [_isPointed, _setPointed] = createSignal(params.has('t'));
  let slider!: HTMLInputElement;

  onMount(() => {
    ['touchstart', 'touchmove', 'touchend'].forEach(type => {
      slider.addEventListener(type, (e) => e.stopPropagation());
    });
  });

  function updatePositionState() {
    const { audio } = playerStore;
    const msn = 'mediaSession' in navigator;
    if (msn && 'setPositionState' in navigator.mediaSession)
      navigator.mediaSession.setPositionState({
        duration: audio.duration || 0,
        playbackRate: audio.playbackRate || 1,
        position: Math.floor(audio.currentTime || 0),
      });
  }

  return (
    <>
      {/* Progress slider */}
      <span class="slider">
        <input
          type="range"
          value={playerStore.currentTime}
          max={playerStore.fullDuration}
          ref={slider}
          onchange={(e) => {
            playerStore.audio.currentTime = parseInt(e.target.value);
          }}
        />
        <div>
          <p id="currentDuration">{convertSStoHHMMSS(playerStore.currentTime)}</p>
          <p id="fullDuration">{convertSStoHHMMSS(playerStore.fullDuration)}</p>
        </div>
      </span>

      {/* Main controls — always show prev / play / next */}
      <div class="mainShelf">
        <button
          aria-label={t('player_play_previous')}
          class="ri-skip-back-line"
          id="playPrevButton"
          onclick={playPrev}
          disabled={!playerStore.history.length}
        />

        <button
          aria-label={t('player_seek_backward')}
          class="ri-replay-15-line"
          id="seekBwdButton"
          onclick={() => { playerStore.audio.currentTime -= 15; }}
        />

        <PlayButton />

        <button
          aria-label={t('player_seek_forward')}
          class="ri-forward-15-line"
          id="seekFwdButton"
          onclick={() => { playerStore.audio.currentTime += 15; }}
        />

        <PlayNextButton />
      </div>

      {/* Secondary controls */}
      <div class="bottomShelf">

        <select
          id="playSpeed"
          value={playerStore.playbackRate.toFixed(2)}
          onchange={e => {
            const ref = e.target;
            const speed = parseFloat(ref.value);
            playerStore.audio.playbackRate = speed;
            setPlayerStore('playbackRate', speed);
            updatePositionState();
            ref.blur();
          }}
        >
          <option value="0.50">0.5x</option>
          <option value="0.75">0.75x</option>
          <option value="1.00">1x</option>
          <option value="1.25">1.25x</option>
          <option value="1.50">1.5x</option>
          <option value="2.00">2x</option>
        </select>

        {/* Lyrics button — always visible */}
        <i
          aria-label={t('player_lyrics')}
          class="ri-music-2-line"
          classList={{ on: _.showLyrics() }}
          onclick={() => _.setShowLyrics(!_.showLyrics())}
        />

        <LikeButton />

        <i
          aria-label={t('player_loop')}
          class="ri-repeat-line"
          classList={{ on: playerStore.loop }}
          onclick={() => {
            const next = !playerStore.loop;
            playerStore.audio.loop = next;
            setPlayerStore('loop', next);
          }}
        />

        <select
          id="volumeChanger"
          value={playerStore.volume}
          onchange={e => {
            const ref = e.target;
            const vol = parseFloat(ref.value);
            playerStore.audio.volume = vol;
            setConfig('volume', (vol * 100).toString());
            setPlayerStore('volume', vol);
            ref.blur();
          }}
        >
          <option value="0">0%</option>
          <option value="0.25">25%</option>
          <option value="0.5">50%</option>
          <option value="0.75">75%</option>
          <option value="1">100%</option>
        </select>

      </div>
    </>
  );
}
