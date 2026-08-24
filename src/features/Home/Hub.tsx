import { For, Show, createSignal, onMount } from "solid-js";
import { updateSubfeed } from "@lib/modules/hub";
import { fetchCollection, getCollection, getTracksMap, drawer, generateImageUrl, player } from "@lib/utils";
import { setListStore, setNavStore, setPlayerStore, navStore, t } from "@lib/stores";
import { config } from "@lib/utils";

type FeedItem = { id: string; title: string; author: string; duration: string; authorId: string };

const EDITORIAL: FeedItem[] = [
  { id: 'JGwWNGJdvx8', title: 'Shape of You', author: 'Ed Sheeran', duration: '4:23', authorId: '' },
  { id: 'kJQP7kiw5Fk', title: 'Despacito', author: 'Luis Fonsi', duration: '4:41', authorId: '' },
  { id: 'OPf0YbXqDm0', title: 'Uptown Funk', author: 'Mark Ronson', duration: '4:30', authorId: '' },
  { id: 'YQHsXMglC9A', title: 'Hello', author: 'Adele', duration: '6:07', authorId: '' },
  { id: '2Vv-BfVoq4g', title: 'Perfect', author: 'Ed Sheeran', duration: '4:39', authorId: '' },
  { id: 'hT_nvWreIhg', title: 'Counting Stars', author: 'OneRepublic', duration: '4:17', authorId: '' },
  { id: 'fJ9rUzIMcZQ', title: 'Bohemian Rhapsody', author: 'Queen', duration: '5:55', authorId: '' },
  { id: '09R8_2nJtjg', title: 'Sugar', author: 'Maroon 5', duration: '3:55', authorId: '' },
];

const CATEGORIES = [
  { label: 'Pop', query: 'top pop hits 2025', color: '#FF5F1F' },
  { label: 'Hip-Hop', query: 'hip hop hits 2025', color: '#a855f7' },
  { label: 'Latin', query: 'latin hits 2025', color: '#f59e0b' },
  { label: 'Rock', query: 'rock hits 2025', color: '#ef4444' },
  { label: 'Electronic', query: 'electronic dance 2025', color: '#06b6d4' },
  { label: 'R&B', query: 'rnb soul hits 2025', color: '#84cc16' },
  { label: 'Jazz', query: 'jazz classics best', color: '#f97316' },
  { label: 'Workout', query: 'workout motivation 2025', color: '#ec4899' },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function playItem(item: CollectionItem | FeedItem, contextId: string, contextSrc: Context) {
  setPlayerStore('stream', {
    id: item.id,
    title: item.title,
    author: item.author || '',
    duration: item.duration,
    authorId: item.authorId || '',
  });
  setPlayerStore('context', { id: contextId, src: contextSrc });
  const isPortrait = matchMedia('(orientation:portrait)').matches;
  if (isPortrait || config.landscapeSections === '1') {
    setNavStore('player', 'state', Boolean(config.watchMode));
    if (config.watchMode) navStore.player.ref?.scrollIntoView();
  }
  player(item.id);
}

/* Circular card — used for Recently Played & Top Picks */
function SongCard(props: { item: CollectionItem | FeedItem; contextId: string; contextSrc: Context }) {
  const img = () => generateImageUrl(props.item.id, 'mq', props.item.author?.endsWith('- Topic'));
  return (
    <div class="hub-card" onclick={() => playItem(props.item, props.contextId, props.contextSrc)}>
      <div class="hub-card-art">
        <img src={img()} alt={props.item.title} loading="lazy" />
        <div class="hub-play-btn">
          <span class="ms material-symbols-outlined">play_arrow</span>
        </div>
      </div>
      <p class="hub-card-title">{props.item.title}</p>
      <p class="hub-card-sub">{props.item.author?.replace(' - Topic', '')}</p>
    </div>
  );
}

/* Large featured banner card */
function FeaturedCard(props: { item: CollectionItem | FeedItem; contextId: string; contextSrc: Context; label?: string }) {
  // 'hq' — YouTube only serves default/mq/hq/sd/maxres thumbnails. A bogus
  // size (e.g. '480') 404s and renders as a broken image.
  const img = () => generateImageUrl(props.item.id, 'hq', props.item.author?.endsWith('- Topic'));
  return (
    <div class="hub-featured" onclick={() => playItem(props.item, props.contextId, props.contextSrc)}>
      <img src={img()} alt={props.item.title} loading="lazy" />
      <div class="hub-featured-overlay">
        <span class="hub-featured-label">{props.label || 'Top Pick'}</span>
        <h3 class="hub-featured-title">{props.item.title}</h3>
        <p class="hub-featured-sub">{props.item.author?.replace(' - Topic', '')}</p>
        <div class="hub-featured-play">
          <span class="ms material-symbols-outlined">play_arrow</span>
        </div>
      </div>
    </div>
  );
}

/* Compact list row — used for Frequently Played & Trending */
function ListRow(props: { item: CollectionItem | FeedItem; contextId: string; contextSrc: Context; rank?: number }) {
  const img = () => generateImageUrl(props.item.id, 'mq', props.item.author?.endsWith('- Topic'));
  return (
    <div class="hub-list-row" onclick={() => playItem(props.item, props.contextId, props.contextSrc)}>
      <div class="hub-list-art">
        <img src={img()} alt={props.item.title} loading="lazy" />
      </div>
      <div class="hub-list-info">
        <p>{props.item.title}</p>
        <p>{props.item.author?.replace(' - Topic', '')}</p>
      </div>
      <Show when={props.rank !== undefined}>
        <span class="hub-list-num">#{props.rank! + 1}</span>
      </Show>
    </div>
  );
}

export default function() {
  const [subfeed, setSubfeed] = createSignal<FeedItem[]>(drawer.subfeed as FeedItem[] || []);
  const trending = () => EDITORIAL;
  const [isLoading, setIsLoading] = createSignal(true);

  onMount(() => {
    Promise.all([
      (!drawer.subfeed?.length
        ? updateSubfeed().then(() => setSubfeed(drawer.subfeed as FeedItem[] || []))
        : Promise.resolve()
      )
    ]).finally(() => setIsLoading(false));
  });

  const tracksMap = getTracksMap();
  const recents = () => getCollection('history')
    .slice(0, 12)
    .map(id => tracksMap[id])
    .filter(Boolean) as CollectionItem[];

  const frequent = () => Object.values(getTracksMap())
    .filter(t => t.plays && t.plays > 1)
    .sort((a, b) => (b.plays as number) - (a.plays as number))
    .slice(0, 5) as CollectionItem[];

  function goToSearch(query: string) {
    import('@lib/stores').then(({ setStore }) => setStore('homeView', 'Search'));
    import('@lib/utils').then(({ setConfig }) => setConfig('home', 'Search'));
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>('input[type="search"], .search input, #searchInput');
      if (input) { input.value = query; input.dispatchEvent(new Event('input', { bubbles: true })); }
    }, 150);
  }

  const featuredItems = () => subfeed().length ? subfeed() : trending();

  return (
    <div class="hub">

      {/* Greeting */}
      <div class="hub-greeting">
        <h1>{greeting()}</h1>
        <p>What do you want to listen to?</p>
      </div>

      {/* Recently Played — square rounded cards */}
      <Show when={recents().length > 0}>
        <section class="hub-section">
          <div class="hub-section-header">
            <div class="hub-section-titles">
              <h2>Recently Played</h2>
            </div>
            <button onclick={() => fetchCollection('history')}>SEE ALL</button>
          </div>
          <div class="hub-scroll">
            <For each={recents()}>
              {item => <SongCard item={item} contextId="Recently Played" contextSrc="hub" />}
            </For>
          </div>
        </section>
      </Show>

      {/* Top Picks — featured banner + square scroll */}
      <Show when={featuredItems().length > 0}>
        <section class="hub-section">
          <div class="hub-section-header">
            <div class="hub-section-titles">
              <h2>Made for you</h2>
              <p class="hub-section-subtitle">Mixes and tracks to start with</p>
            </div>
            <button onclick={() => {
              const items = featuredItems().map(i => ({ ...i, duration: i.duration || '' }));
              setListStore({ name: 'Top Picks', list: items as CollectionItem[] });
              setNavStore('list', 'state', true);
            }}>SEE ALL</button>
          </div>
          <FeaturedCard item={featuredItems()[0]} contextId="Top Picks" contextSrc="hub" label="Playlist of the Day" />
          <Show when={featuredItems().length > 1}>
            <div class="hub-scroll" style={{ 'margin-top': '14px' }}>
              <For each={featuredItems().slice(1, 8)}>
                {item => <SongCard item={item} contextId="Top Picks" contextSrc="hub" />}
              </For>
            </div>
          </Show>
        </section>
      </Show>

      {/* Loading */}
      <Show when={isLoading() && !featuredItems().length}>
        <div class="hub-loading">
          <i class="ri-refresh-line loading" />
          <p>Loading picks…</p>
        </div>
      </Show>

      {/* Frequently Played — compact list rows */}
      <Show when={frequent().length > 0}>
        <section class="hub-section">
          <div class="hub-section-header">
            <h2>Frequently Played</h2>
            <button onclick={() => {
              setListStore({ name: t('hub_frequently_played'), list: frequent() });
              setNavStore('list', 'state', true);
            }}>SEE ALL</button>
          </div>
          <div class="hub-list">
            <For each={frequent()}>
              {(item, i) => <ListRow item={item} contextId={t('hub_frequently_played')} contextSrc="hub" rank={i()} />}
            </For>
          </div>
        </section>
      </Show>

      {/* Trending Now — compact list rows */}
      <Show when={trending().length >= 3}>
        <section class="hub-section">
          <div class="hub-section-header">
            <h2>Trending Now</h2>
          </div>
          <div class="hub-list">
            <For each={trending().slice(0, 5)}>
              {(item, i) => <ListRow item={item} contextId="Trending Now" contextSrc="hub" rank={i()} />}
            </For>
          </div>
        </section>
      </Show>

      {/* Browse by Genre */}
      <section class="hub-section">
        <div class="hub-section-header">
          <h2>Browse by Genre</h2>
        </div>
        <div class="hub-genre-grid">
          <For each={CATEGORIES}>
            {cat => (
              <div
                class="hub-genre-card"
                style={{ '--genre-color': cat.color }}
                onclick={() => goToSearch(cat.query)}
              >
                <span>{cat.label}</span>
              </div>
            )}
          </For>
        </div>
      </section>

    </div>
  );
}
