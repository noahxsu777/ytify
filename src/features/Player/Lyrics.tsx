import { createSignal, For, Show, onMount, onCleanup } from "solid-js";
import { playerStore, setPlayerStore } from "@lib/stores";

const LRCLIB = 'https://lrclib.net/api';
const HEADERS = { 'Lrclib-Client': `ytify ${Build} (https://github.com/n-ce/ytify)` };

type LrcResult = { id: number; title: string; artistName: string; syncedLyrics: string | null; plainLyrics: string | null; duration: number };
type Mode = 'loading' | 'synced' | 'plain' | 'alternatives' | 'empty';

function parseLrc(lrc: string, offset: number): { lines: string[]; times: number[] } {
  const lines: string[] = [];
  const times: number[] = [];
  for (const line of lrc.split('\n')) {
    const [d, l] = line.split(']');
    if (!l) { lines.push('♪'); times.push(times[times.length - 1] ?? 0); continue; }
    const [mm, ss] = d.substring(1).split(':');
    times.push((parseInt(mm) * 60) + parseFloat(ss) - offset);
    lines.push(l.trim() || '♪');
  }
  return { lines, times };
}

export default function(_props: { onClose: () => void }) {
  const [mode, setMode] = createSignal<Mode>('loading');
  const [lines, setLines] = createSignal<string[]>([]);
  const [alternatives, setAlternatives] = createSignal<LrcResult[]>([]);
  const [activeLine, setActiveLine] = createSignal(-1);
  let lyricsDiv!: HTMLDivElement;

  function attachSync(times: number[]) {
    setPlayerStore({
      lrcSync: (d: number) => {
        let idx = -1;
        for (let i = 0; i < times.length; i++) {
          if (times[i] <= d) idx = i; else break;
        }
        if (idx !== activeLine()) {
          setActiveLine(idx);
          if (idx >= 0 && lyricsDiv?.children[idx])
            lyricsDiv.children[idx].scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }
    });
  }

  function loadResult(data: LrcResult) {
    const offset = data.duration && playerStore.fullDuration
      ? (playerStore.fullDuration - data.duration) / 2 : 0;

    if (data.syncedLyrics) {
      const { lines: l, times } = parseLrc(data.syncedLyrics, offset);
      setLines(l);
      setMode('synced');
      attachSync(times);
    } else if (data.plainLyrics) {
      setLines(data.plainLyrics.split('\n').filter(Boolean));
      setMode('plain');
    }
  }

  async function trySearch(title: string, artist: string) {
    // Search by artist + title
    const r1 = await fetch(`${LRCLIB}/search?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`, { headers: HEADERS })
      .then(r => r.ok ? r.json() as Promise<LrcResult[]> : []).catch(() => []);

    if (r1.length) {
      // Best match first — prefer synced lyrics
      const sorted = [...r1].sort((a, b) => (b.syncedLyrics ? 1 : 0) - (a.syncedLyrics ? 1 : 0));
      // Auto-load best result
      loadResult(sorted[0]);
      if (!['synced', 'plain'].includes(mode())) {
        // Show top 3 as alternatives
        setAlternatives(sorted.slice(0, 3));
        setMode('alternatives');
      }
      return;
    }

    // Search by title only (no artist filter)
    const r2 = await fetch(`${LRCLIB}/search?track_name=${encodeURIComponent(title)}`, { headers: HEADERS })
      .then(r => r.ok ? r.json() as Promise<LrcResult[]> : []).catch(() => []);

    if (r2.length) {
      const sorted = [...r2].sort((a, b) => (b.syncedLyrics ? 1 : 0) - (a.syncedLyrics ? 1 : 0));
      loadResult(sorted[0]);
      if (!['synced', 'plain'].includes(mode())) {
        setAlternatives(sorted.slice(0, 3));
        setMode('alternatives');
      }
      return;
    }

    setMode('empty');
  }

  onMount(async () => {
    const { title, author } = playerStore.stream;
    const artist = author?.endsWith(' - Topic') ? author.slice(0, -8) : (author || '');

    // 1. Try exact match with duration
    try {
      const data: LrcResult = await fetch(
        `${LRCLIB}/get?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}&duration=${playerStore.fullDuration}`,
        { headers: HEADERS }
      ).then(r => r.ok ? r.json() : null);

      if (data?.syncedLyrics || data?.plainLyrics) {
        loadResult(data);
        return;
      }
    } catch { /* fall through */ }

    // 2. Try without duration (looser match)
    try {
      const data: LrcResult = await fetch(
        `${LRCLIB}/get?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`,
        { headers: HEADERS }
      ).then(r => r.ok ? r.json() : null);

      if (data?.syncedLyrics || data?.plainLyrics) {
        loadResult(data);
        return;
      }
    } catch { /* fall through */ }

    // 3. Search with alternatives
    await trySearch(title, artist);
  });

  onCleanup(() => setPlayerStore('lrcSync', undefined));

  return (
    <div class="lyrics" ref={lyricsDiv}>

      {/* Loading */}
      <Show when={mode() === 'loading'}>
        <p class="lyrics-status">
          <i class="ri-loader-3-line" style={{ display: 'inline-block', animation: 'spinner 1s linear infinite', 'vertical-align': 'middle', 'margin-right': '8px' }} />
          Searching lyrics…
        </p>
      </Show>

      {/* Synced karaoke lyrics */}
      <Show when={mode() === 'synced'}>
        <For each={lines()}>
          {(line, i) => (
            <p classList={{ active: activeLine() === i() }}>{line}</p>
          )}
        </For>
      </Show>

      {/* Plain (unsynced) lyrics */}
      <Show when={mode() === 'plain'}>
        <p class="lyrics-badge">Unsynced lyrics</p>
        <For each={lines()}>
          {line => <p class="plain">{line || ' '}</p>}
        </For>
      </Show>

      {/* Alternatives picker */}
      <Show when={mode() === 'alternatives'}>
        <p class="lyrics-status">Showing closest match. Pick another:</p>
        <For each={alternatives()}>
          {(alt, i) => (
            <div class="lyrics-alt" onclick={() => { loadResult(alt); setMode(alt.syncedLyrics ? 'synced' : 'plain'); }}>
              <span class="lyrics-alt-num">{i() + 1}</span>
              <div>
                <p>{alt.title}</p>
                <p>{alt.artistName}</p>
              </div>
              <Show when={alt.syncedLyrics}><span class="lyrics-alt-badge">Synced</span></Show>
            </div>
          )}
        </For>
        <Show when={lines().length > 0}>
          <div style={{ 'margin-top': '20px' }}>
            <For each={lines()}>
              {(line, i) => <p classList={{ active: activeLine() === i(), plain: mode() !== 'synced' }}>{line}</p>}
            </For>
          </div>
        </Show>
      </Show>

      {/* Nothing found */}
      <Show when={mode() === 'empty'}>
        <p class="lyrics-status">No lyrics found for this song.</p>
      </Show>

    </div>
  );
}
