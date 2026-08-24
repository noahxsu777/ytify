import { ErrorBoundary, For, Show } from 'solid-js';
import { searchStore } from '@lib/stores';
import ListItem from '@components/ListItem';
import StreamItem from '@components/StreamItem';


function isStreamItem(item: YTStreamItem | YTListItem): item is YTStreamItem {
  return item?.type === 'stream' || item?.type === 'video';
}

export default function SearchResults() {
  return (
    <div class="searchlist">
      <Show when={searchStore.isLoading}>
        <i class="ri-loader-3-line"></i>
      </Show>
      <Show when={!searchStore.isLoading && searchStore.query && searchStore.results.length === 0}>
        <p class="search-empty">No results. Try another search.</p>
      </Show>
      <ErrorBoundary fallback={<p class="search-empty">Search hit a glitch. Try again.</p>}>
        <For each={searchStore.results}>
          {(item) => (
            <Show when={isStreamItem(item)} fallback={
              <Show when={(item as YTListItem)?.url}>
                <ListItem {...item as YTListItem} />
              </Show>
            }>
              <Show when={(item as YTStreamItem).id}>
                <StreamItem
                  {...item as YTStreamItem}
                  context={{
                    src: 'search',
                    id: searchStore.query || 'search'
                  }}
                />
              </Show>
            </Show>
          )}
        </For>
      </ErrorBoundary>
    </div>
  );
}
