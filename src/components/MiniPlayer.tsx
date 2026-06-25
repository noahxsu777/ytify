import { lazy, Show } from "solid-js";
import './MiniPlayer.css';
import { config } from "@lib/utils/config";
import { LikeButton, MediaDetails, PlayButton, PlayNextButton } from "./MediaPartials";
import { playerStore, setNavStore } from "@lib/stores";
import { queueStore } from "@lib/stores/queue";

const MediaArtwork = lazy(() => import('./MediaPartials/MediaArtwork'));

export default function() {
  return (
    <div class='miniplayer' onclick={(e) => {
      if (!(e.target as HTMLElement).closest('button'))
        setNavStore('player', 'state', true);
    }}>
      {/* Progress bar — sits at bottom of the card */}
      <progress value={((playerStore.currentTime / playerStore.fullDuration) || 0).toFixed(3)} />

      {/* Artwork */}
      <Show when={config.loadImage}>
        <MediaArtwork />
      </Show>

      {/* Title + artist */}
      <MediaDetails />

      {/* Controls */}
      <div class="mp-controls">
        <PlayButton />
        <Show when={queueStore.list.length} fallback={<LikeButton />}>
          <PlayNextButton />
        </Show>
      </div>
    </div>
  );
}
