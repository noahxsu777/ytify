import { lazy, Show } from "solid-js";
import './MiniPlayer.css';
import { config } from "@lib/utils/config";
import { MediaDetails, PlayButton } from "./MediaPartials";
import { playerStore, setNavStore } from "@lib/stores";


const MediaArtwork = lazy(() => import('./MediaPartials/MediaArtwork'));

export default function() {
  return (
    <div class='miniplayer' onclick={(e) => {
      if (!(e.target as HTMLElement).closest('button'))
        setNavStore('player', 'state', true);
    }}>

      {/* Artwork */}
      <Show when={config.loadImage}>
        <MediaArtwork />
      </Show>

      {/* Title + artist */}
      <div class="mp-info"><MediaDetails /><progress value={((playerStore.currentTime / playerStore.fullDuration) || 0).toFixed(3)} /></div>

      {/* Controls */}
      <div class="mp-controls">
        <PlayButton />

      </div>
    </div>
  );
}
