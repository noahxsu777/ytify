import { store } from '@lib/stores';
import { config } from '@lib/utils';
import fetchYoutubeSearchResults from './fetchYoutubeSearchResults';

// Filter mapping for both the server-side /api/search and direct Invidious fallback
const filterToInvidiousType: Record<string, string> = {
  songs: 'video',
  videos: 'video',
  albums: 'playlist',
  artists: 'channel',
  playlists: 'playlist',
};

export default async function(query: string): Promise<(YTStreamItem | YTListItem)[]> {
  const musicFilter = config.searchFilter.substring(6); // e.g. "songs" from "music_songs"
  const filter = musicFilter || 'songs';

  // Try the server-side YouTube Music search API first (no Invidious dependency)
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&filter=${encodeURIComponent(filter)}`);
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.results) && json.results.length > 0)
        return json.results;
    }
  } catch {
    // fall through to direct Invidious
  }

  // Fallback: search Invidious directly
  const type = filterToInvidiousType[filter] || 'video';
  const instances = store.invidious;
  if (!instances.length) throw new Error('No Invidious instances available');

  let index = instances.length - 1;
  const attempt = (): Promise<(YTStreamItem | YTListItem)[]> =>
    fetchYoutubeSearchResults(instances[index], query, type, 1)
      .catch(e => {
        if (index > 0) { index--; return attempt(); }
        throw e;
      });

  return attempt();
}
