import { For, Show, createSignal, createMemo } from "solid-js";
import { updateSubfeed, updateGallery } from "@lib/modules/hub";
import { fetchCollection, getCollection, getTracksMap, drawer, setDrawer, generateImageUrl, getThumbIdFromLink } from "@lib/utils";
import ListItem from "@components/ListItem";
import StreamItem from "@components/StreamItem";
import GreetingCard from "@components/GreetingCard";
import { setListStore, setNavStore, t } from "@lib/stores";

export default function() {
  const [subfeed, setSubfeed] = createSignal(drawer.subfeed);
  const [gallery, setGallery] = createSignal({
    userArtists: drawer.userArtists,
    relatedArtists: drawer.relatedArtists,
    relatedPlaylists: drawer.relatedPlaylists
  });

  const tracksMap = getTracksMap();
  const recents = getCollection('history')
    .slice(0, 10)
    .map(id => tracksMap[id])
    .filter(Boolean) as CollectionItem[];

  const [isSubfeedLoading, setIsSubfeedLoading] = createSignal(false);
  const [isGalleryLoading, setIsGalleryLoading] = createSignal(false);

  const getFrequentlyPlayedTracks = (limit?: number) => {
    const allTracks = Object.values(getTracksMap());
    const filteredAndSorted = allTracks
      .filter(track => track.plays && track.plays > 1)
      .sort((a, b) => (b.plays as number) - (a.plays as number));

    return filteredAndSorted.slice(0, limit || 100) as CollectionItem[];
  };

  const handleSubfeedRefresh = () => {
    setIsSubfeedLoading(true);
    updateSubfeed().then(() => {
      setSubfeed(drawer.subfeed);
      setIsSubfeedLoading(false);
    });
  };

  const handleGalleryRefresh = () => {
    setIsGalleryLoading(true);
    updateGallery().then(() => {
      setGallery({
        userArtists: drawer.userArtists,
        relatedArtists: drawer.relatedArtists,
        relatedPlaylists: drawer.relatedPlaylists
      });
      setIsGalleryLoading(false);
    });
  };

  const shuffle = <T,>(array: T[]): T[] => {
    if (!array) return [];
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const greetingItems = createMemo(() => {
    const artists = gallery().userArtists || [];
    const playlists = gallery().relatedPlaylists || [];
    const combined = [
       ...artists.map(i => ({...i, url: `/artist/${i.id}`})),
       ...playlists.map(i => ({...i, url: `/playlist/${i.id}`}))
    ];
    return shuffle(combined).slice(0, 6);
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div class="hub">

      {/* Greeting Section */}
      <section class="greeting-section">
        <h2>{getGreeting()}</h2>
        <div class="greeting-grid">
           <For each={greetingItems()}>
             {(item) => (
               <GreetingCard
                 title={item.name}
                 thumbnail={generateImageUrl(getThumbIdFromLink(item.thumbnail), '100')}
                 url={item.url}
               />
             )}
           </For>
        </div>
      </section>

      {/* Made For You / Gallery */}
      <article class="gallery-article">
        <div class="header-row">
           <p>{t('hub_gallery')}</p>
           <div class="controls">
             <i
               aria-label={t('hub_refresh')}
               aria-busy={isGalleryLoading()}
               classList={{ 'ri-refresh-line': true, 'loading': isGalleryLoading() }}
               onclick={handleGalleryRefresh}
             ></i>
           </div>
        </div>

        <div class="horizontal-scroll">
          <Show when={gallery().relatedArtists?.length > 0}>
            <For each={shuffle(gallery().relatedArtists)}>
              {(item) => (
                <ListItem
                  stats={''}
                  title={item.name}
                  url={`/artist/${item.id}`}
                  thumbnail={generateImageUrl(getThumbIdFromLink(item.thumbnail), '')}
                  uploaderData={''}
                />
              )}
            </For>
          </Show>
           <Show when={gallery().relatedPlaylists?.length > 0}>
            <For each={shuffle(gallery().relatedPlaylists)}>
              {(item) => (
                <ListItem
                  stats={''}
                  title={item.name}
                  url={`/playlist/${item.id}`}
                  thumbnail={generateImageUrl(getThumbIdFromLink(item.thumbnail), '')}
                  uploaderData={''}
                />
              )}
            </For>
          </Show>
        </div>
      </article>

      {/* Recently Played */}
       <article>
        <p>{t('hub_recently_listened')}</p>
        <div>
          <Show
            when={recents.length > 0}
            fallback={t('hub_recently_listened_fallback')}
          >
            <For each={recents.slice(0, 10)}>
              {(item) => (
                <StreamItem
                  id={item.id}
                  title={item.title}
                  author={item.author}
                  duration={item.duration}
                  authorId={item.authorId}
                  context={{
                    id: t('hub_recently_listened'),
                    src: 'hub'
                  }}
                />
              )}
            </For>
          </Show>
        </div>
      </article>

      {/* Subfeed */}
      <article class="subfeed">
        <p>{t('hub_subfeed')}</p>
         <i
            aria-label={t('hub_refresh')}
            aria-busy={isSubfeedLoading()}
            classList={{ 'ri-refresh-line': true, 'loading': isSubfeedLoading() }}
            onclick={handleSubfeedRefresh}
            style="margin-left: 10px;"
          ></i>
        <div>
          <Show
            when={subfeed()?.length > 0}
            fallback={t('hub_subfeed_fallback')}
          >
            <For each={subfeed().slice(0, 5)}>
              {(item) => (
                <StreamItem
                  id={item.id}
                  title={item.title}
                  author={item.author}
                  duration={item.duration}
                  authorId={item.authorId}
                  context={{
                    id: t('hub_subfeed'),
                    src: 'hub'
                  }}
                />
              )}
            </For>
          </Show>
        </div>
      </article>

      {/* Frequently Played */}
      <article>
        <p>{t('hub_frequently_played')}</p>
        <div>
          <Show
            when={getFrequentlyPlayedTracks(5).length > 0}
            fallback={t('hub_frequently_played_fallback')}
          >
            <For each={getFrequentlyPlayedTracks(5)}>
              {(item) => (
                <StreamItem
                  id={item.id}
                  title={item.title}
                  author={item.author}
                  duration={item.duration}
                  authorId={item.authorId}
                  context={{
                    id: t('hub_frequently_played'),
                    src: 'hub'
                  }}
                />
              )}
            </For>
          </Show>
        </div>
      </article>

      {/* Discovery */}
      <article>
        <p>{t('hub_discovery')}</p>
        <div>
          <Show
            when={!!drawer.discovery?.length}
            fallback={t('hub_discovery_fallback')}
          >
            <For each={drawer.discovery?.slice(0, 5)}>
              {(item) => (
                <StreamItem
                  id={item.id}
                  title={item.title}
                  author={item.author}
                  duration={item.duration}
                  authorId={item.authorId}
                  context={{
                    id: t('hub_discovery'),
                    src: 'hub'
                  }}
                />
              )}
            </For>
          </Show>
        </div>
      </article>

    </div >
  );
}
