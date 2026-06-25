import { store } from '@lib/stores';
import { config } from '@lib/utils';
import fetchYoutubeSearchResults from './fetchYoutubeSearchResults';

// Map the YTMusic-style filters to Invidious search types.
// We no longer depend on the serverless /api/search backend; instead we
// search Invidious instances directly from the client, which is the same
// source used for playback.
const filterToInvidiousType: Record<string, string> = {
  songs: 'video',
  videos: 'video',
  albums: 'playlist',
  artists: 'channel',
  playlists: 'playlist',
};

export default async function(
  query: string,
): Promise<(YTStreamItem | YTListItem)[]> {
  // config.searchFilter looks like "music_songs"; take the part after "music_"
  const musicFilter = config.searchFilter.substring(6);
  const type = filterToInvidiousType[musicFilter] || 'video';

  const instances = store.invidious;
  if (!instances.length)
    throw new Error('No Invidious instances available');

  // Try instances from the end of the list backwards until one works.
  let index = instances.length - 1;
  const attempt = (): Promise<(YTStreamItem | YTListItem)[]> =>
    fetchYoutubeSearchResults(instances[index], query, type, 1)
      .catch(e => {
        if (index > 0) {
          index--;
          return attempt();
        }
        throw e;
      });

  return attempt();
}
