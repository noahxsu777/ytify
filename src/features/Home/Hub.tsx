import { For, Show, createMemo } from "solid-js";
import { getCollection, getTracksMap, drawer, generateImageUrl, getThumbIdFromLink, fetchCollection } from "@lib/utils";
import ListItem from "@components/ListItem";
import { setListStore, setNavStore, t } from "@lib/stores";

export default function() {
  const timeOfDay = createMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  });

  const tracksMap = getTracksMap();
  const recents = () => getCollection('history')
    .slice(0, 10)
    .map(id => tracksMap[id])
    .filter(Boolean) as CollectionItem[];

  const quickAccess = [
    { title: 'Liked Songs', icon: 'ri-heart-fill', color: 'linear-gradient(135deg, #450af5, #c4efd9)', action: () => fetchCollection('favorites') },
    { title: 'On Repeat', icon: 'ri-repeat-line', color: 'linear-gradient(135deg, #ba5370, #f4e2d8)', action: () => fetchCollection('history') }, // Placeholder logic
    { title: 'Listen Later', icon: 'ri-calendar-schedule-fill', color: 'linear-gradient(135deg, #00c6ff, #0072ff)', action: () => fetchCollection('listenLater') },
    { title: 'Top Mixes', icon: 'ri-music-2-line', color: 'linear-gradient(135deg, #f093fb, #f5576c)', action: () => {} },
    { title: 'Discover', icon: 'ri-signpost-fill', color: 'linear-gradient(135deg, #84fab0, #8fd3f4)', action: () => {
        const discoveryItems = drawer.discovery || [];
        setListStore({
            name: t('hub_discovery'),
            list: discoveryItems as CollectionItem[],
        });
        setNavStore('list', 'state', true);
    }},
    { title: 'Podcasts', icon: 'ri-radio-line', color: 'linear-gradient(135deg, #fa709a, #fee140)', action: () => {} },
  ];

  return (
    <div class="hub-container">
      <div class="greeting-header">
        <h1>{timeOfDay()}</h1>
        <div class="user-profile">
            <i class="ri-user-3-line"></i>
        </div>
      </div>

      <div class="quick-grid">
        <For each={quickAccess}>
            {(item) => (
                <div class="grid-item" style={{background: item.color}} onClick={item.action}>
                    <i class={item.icon}></i>
                    <span>{item.title}</span>
                </div>
            )}
        </For>
      </div>

      <div class="section-header">
        <h2>Your Top Mixes</h2>
      </div>
      <div class="horizontal-scroll">
         <Show when={drawer.relatedPlaylists?.length > 0} fallback={<p class="empty-state">Start listening to get recommendations</p>}>
            <For each={drawer.relatedPlaylists.slice(0, 6)}>
                {(item) => (
                    <div class="scroll-item">
                        <ListItem
                            stats={''}
                            title={item.name}
                            url={`/playlist/${item.id}`}
                            thumbnail={generateImageUrl(getThumbIdFromLink(item.thumbnail), '')}
                            uploaderData={''}
                        />
                    </div>
                )}
            </For>
         </Show>
      </div>

      <div class="section-header">
        <h2>Recently Played</h2>
      </div>
      <div class="horizontal-scroll round-avatars">
        <Show when={recents().length > 0} fallback={<p class="empty-state">No recent history</p>}>
            <For each={recents()}>
                {(item) => (
                    <div class="scroll-item">
                         {/* We repurpose ListItem but style it circular via CSS */}
                        <ListItem
                            stats={''}
                            title={item.title}
                            url={`/artist/${item.authorId}`} /* Link to artist or play? Old Hub linked stream items. ListItem links to lists. */
                            /* We want to play the song or go to context? ListItem logic handles navigation. */
                            /* If it's a song, ListItem might not be best. But design wants circular avatars usually for Artists. */
                            /* Let's assume recently played includes Artists or we map song to Artist logic. */
                            /* Actually, recents are tracks. ListItem expects url to be /artist, /playlist etc. */
                            /* If I pass /artist/${item.authorId}, it goes to artist. */
                            thumbnail={generateImageUrl(item.id, 'mq')}
                            uploaderData={item.author || ''}
                        />
                    </div>
                )}
            </For>
        </Show>
      </div>

      {/* Spacer for bottom nav */}
      <div style={{"height": "120px"}}></div>
    </div>
  );
}
