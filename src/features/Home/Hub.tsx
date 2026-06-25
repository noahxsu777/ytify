import { For, Show, createSignal, onMount } from "solid-js";
import { updateSubfeed } from "@lib/modules/hub";
import { fetchCollection, getCollection, getTracksMap, drawer, generateImageUrl, player } from "@lib/utils";
import { setListStore, setNavStore, setPlayerStore, navStore, t } from "@lib/stores";
import { config } from "@lib/utils";

const CATEGORIES = [
  { label: 'Pop', query: 'top pop hits 2024', color: '#FF5F1F' },
  { label: 'Hip-Hop', query: 'hip hop hits 2024', color: '#a855f7' },
  { label: 'Latin', query: 'latin hits 2024', color: '#f59e0b' },
  { label: 'Rock', query: 'rock hits 2024', color: '#ef4444' },
  { label: 'Electronic', query: 'electronic dance music 2024', color: '#06b6d4' },
  { label: 'R&B', query: 'rnb soul hits 2024', color: '#84cc16' },
  { label: 'Jazz', query: 'jazz classics', color: '#f97316' },
  { label: 'Workout', query: 'workout motivation music 2024', color: '#ec4899' },
];

function playItem(item: CollectionItem, contextId: string, contextSrc: Context) {
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

function SongCard(props: { item: CollectionItem; contextId: string; contextSrc: Context }) {
  const img = () => generateImageUrl(props.item.id, 'mq', props.item.author?.endsWith('- Topic'));
  return (
    <div class="hub-card" onclick={() => playItem(props.item, props.contextId, props.contextSrc)}>
      <div class="hub-card-art">
        <img src={img()} alt={props.item.title} loading="lazy" />
      </div>
      <p class="hub-card-title">{props.item.title}</p>
      <p class="hub-card-sub">{props.item.author?.replace(' - Topic', '')}</p>
    </div>
  );
}

function FeaturedCard(props: { item: CollectionItem; contextId: string; contextSrc: Context }) {
  const img = () => generateImageUrl(props.item.id, '480', props.item.author?.endsWith('- Topic'));
  return (
    <div class="hub-featured" onclick={() => playItem(props.item, props.contextId, props.contextSrc)}>
      <img src={img()} alt={props.item.title} loading="lazy" />
      <div class="hub-featured-overlay">
        <span class="hub-featured-label">Top Pick</span>
        <h3 class="hub-featured-title">{props.item.title}</h3>
        <p class="hub-featured-sub">{props.item.author?.replace(' - Topic', '')}</p>
      </div>
    </div>
  );
}

function GridCard(props: { item: CollectionItem; contextId: string; contextSrc: Context }) {
  const img = () => generateImageUrl(props.item.id, 'mq', props.item.author?.endsWith('- Topic'));
  return (
    <div class="hub-grid-card" onclick={() => playItem(props.item, props.contextId, props.contextSrc)}>
      <div class="hub-grid-art">
        <img src={img()} alt={props.item.title} loading="lazy" />
      </div>
      <p class="hub-card-title">{props.item.title}</p>
      <p class="hub-card-sub">{props.item.author?.replace(' - Topic', '')}</p>
    </div>
  );
}

export default function() {
  const [subfeed, setSubfeed] = createSignal(drawer.subfeed || []);
  const [isSubfeedLoading, setIsSubfeedLoading] = createSignal(false);

  onMount(() => {
    if (!drawer.subfeed?.length) {
      setIsSubfeedLoading(true);
      updateSubfeed().then(() => {
        setSubfeed(drawer.subfeed || []);
        setIsSubfeedLoading(false);
      });
    }
  });

  const tracksMap = getTracksMap();
  const recents = () => getCollection('history')
    .slice(0, 10)
    .map(id => tracksMap[id])
    .filter(Boolean) as CollectionItem[];

  const frequent = () => Object.values(getTracksMap())
    .filter(t => t.plays && t.plays > 1)
    .sort((a, b) => (b.plays as number) - (a.plays as number))
    .slice(0, 6) as CollectionItem[];

  function searchCategory(query: string) {
    import('@lib/stores').then(({ setStore }) => {
      setStore('homeView', 'Search');
      import('@lib/utils').then(({ setConfig }) => {
        setConfig('home', 'Search');
      });
      // populate the search with the query
      setTimeout(() => {
        const input = document.querySelector<HTMLInputElement>('#searchInput, input[type="search"], .search input');
        if (input) {
          input.value = query;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, 100);
    });
  }

  return (
    <div class="hub">

      {/* Recently Played */}
      <Show when={recents().length > 0}>
        <section class="hub-section">
          <div class="hub-section-header">
            <h2>{t('hub_recently_listened')}</h2>
            <button onclick={() => fetchCollection('history')}>See All</button>
          </div>
          <div class="hub-scroll">
            <For each={recents()}>
              {item => <SongCard item={item} contextId={t('hub_recently_listened')} contextSrc="hub" />}
            </For>
          </div>
        </section>
      </Show>

      {/* Top Picks — subfeed */}
      <Show when={subfeed().length > 0}>
        <section class="hub-section">
          <div class="hub-section-header">
            <h2>Top Picks for You</h2>
            <button onclick={() => {
              setListStore({ name: 'Top Picks', list: subfeed() as CollectionItem[] });
              setNavStore('list', 'state', true);
            }}>See All</button>
          </div>
          <FeaturedCard item={subfeed()[0] as CollectionItem} contextId="subfeed" contextSrc="hub" />
          <Show when={subfeed().length > 1}>
            <div class="hub-scroll" style={{ 'margin-top': '12px' }}>
              <For each={subfeed().slice(1, 6)}>
                {item => <SongCard item={item as CollectionItem} contextId="subfeed" contextSrc="hub" />}
              </For>
            </div>
          </Show>
        </section>
      </Show>

      {/* Loading subfeed indicator */}
      <Show when={isSubfeedLoading()}>
        <div class="hub-loading">
          <i class="ri-refresh-line loading" />
          <p>Loading top picks…</p>
        </div>
      </Show>

      {/* Frequently Played */}
      <Show when={frequent().length > 0}>
        <section class="hub-section">
          <div class="hub-section-header">
            <h2>{t('hub_frequently_played')}</h2>
            <button onclick={() => {
              setListStore({ name: t('hub_frequently_played'), list: frequent() });
              setNavStore('list', 'state', true);
            }}>See All</button>
          </div>
          <div class="hub-grid">
            <For each={frequent().slice(0, 4)}>
              {item => <GridCard item={item} contextId={t('hub_frequently_played')} contextSrc="hub" />}
            </For>
          </div>
        </section>
      </Show>

      {/* Discovery */}
      <Show when={!!drawer.discovery?.length}>
        <section class="hub-section">
          <div class="hub-section-header">
            <h2>{t('hub_discovery')}</h2>
            <button onclick={() => {
              setListStore({ name: t('hub_discovery'), list: drawer.discovery as CollectionItem[] });
              setNavStore('list', 'state', true);
            }}>See All</button>
          </div>
          <div class="hub-scroll">
            <For each={drawer.discovery?.slice(0, 8)}>
              {item => <SongCard item={item as CollectionItem} contextId={t('hub_discovery')} contextSrc="hub" />}
            </For>
          </div>
        </section>
      </Show>

      {/* Discover by Genre — always visible */}
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
                onclick={() => searchCategory(cat.query)}
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
