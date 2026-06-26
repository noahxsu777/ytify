import { numFormatter, convertSStoHHMMSS, getThumbIdFromLink, generateImageUrl, fetchJson } from "@lib/utils";

// Invidious search result types
interface InvidiousVideoResult {
  type: 'video';
  title: string;
  videoId: string;
  author: string;
  authorId: string;
  authorUrl: string;
  videoThumbnails: {
    quality: string;
    url: string;
    width: number;
    height: number;
  }[];
  description: string;
  descriptionHtml: string;
  viewCount: number;
  viewCountText: string;
  published: number;
  publishedText: string;
  lengthSeconds: number;
  liveNow: boolean;
  premium: boolean;
  isUpcoming: boolean;
}

interface InvidiousChannelResult {
  type: 'channel';
  author: string;
  authorId: string;
  authorUrl: string;
  authorVerified: boolean;
  authorThumbnails: {
    url: string;
    width: number;
    height: number;
  }[];
  subCount: number;
  videoCount: number;
  description: string;
  descriptionHtml: string;
}

interface InvidiousPlaylistItem {
  title: string;
  videoId: string;
  lengthSeconds: number;
  videoThumbnails: {
    url: string;
    width: number;
    height: number;
  }[];
}

interface InvidiousPlaylistResult {
  type: 'playlist';
  title: string;
  playlistId: string;
  playlistThumbnail: string;
  author: string;
  authorId: string;
  authorUrl: string;
  videoCount: number;
  videos: InvidiousPlaylistItem[];
}

type InvidiousSearchResult = InvidiousVideoResult | InvidiousChannelResult | InvidiousPlaylistResult;

export default async function(
  api: string,
  query: string,
  filter: string,
  page: number
): Promise<(YTStreamItem | YTListItem)[]> {
  let type = filter;
  let sort = '';

  if (filter.startsWith('video_'))
    [type, sort] = filter.split('_');

  // First page: try the YouTube Music backend (InnerTube, Google-direct, very
  // reliable). Returns already-mapped results. Only for video/all searches.
  if (page === 1 && (type === 'video' || type === 'all' || filter === 'all')) {
    try {
      const ytFilter = type === 'video' ? 'videos' : 'videos';
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&filter=${ytFilter}`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.results) && json.results.length > 0)
          return json.results as (YTStreamItem | YTListItem)[];
      }
    } catch { /* fall through to Invidious */ }
  }

  let searchPath = `/api/v1/search?q=${encodeURIComponent(query)}&page=${page}&type=${type}`;

  if (sort)
    searchPath += `&sort=${sort}`;

  // Go through the same-origin proxy first (races instances server-side,
  // avoids browser CORS / "Failed to fetch"). Direct instance is the fallback.
  const fetchData = (): Promise<InvidiousSearchResult[]> =>
    fetchJson<InvidiousSearchResult[]>(`/api/iv?path=${encodeURIComponent(searchPath)}`)
      .then(data => {
        if (Array.isArray(data)) return data;
        throw new Error('Proxy returned no results');
      })
      .catch(() => fetchJson<InvidiousSearchResult[]>(`${api}${searchPath}`));

  return fetchData()
    .then(data => {
      return data.filter(item => {
        if (item.type === 'video') {
          const videoItem = item as InvidiousVideoResult;
          return videoItem.lengthSeconds > 60 && videoItem.viewCount > 100;
        } else if (item.type === 'playlist') {
          return !item.title.startsWith('Mix - ');
        }
        return true;
      }).map(item => {
        if (item.type === 'video') {
          const videoItem = item as InvidiousVideoResult;
          return {
            id: videoItem.videoId,
            title: videoItem.title,
            author: videoItem.author,
            duration: convertSStoHHMMSS(videoItem.lengthSeconds),
            authorId: videoItem.authorId,
            views: videoItem.viewCountText,
            img: videoItem.videoId,
            uploaded: videoItem.publishedText,
            type: 'video',
          } as YTStreamItem;
        } else if (item.type === 'channel') {
          const channelItem = item as InvidiousChannelResult;
          return {
            title: channelItem.author,
            stats: `${numFormatter(channelItem.subCount)} subscribers`,
            thumbnail: generateImageUrl(getThumbIdFromLink('https://' + channelItem.authorThumbnails[0].url), ''),
            uploaderData: channelItem.description,
            url: channelItem.authorUrl,
            type: 'channel',
          } as YTListItem;
        } else {
          const playlistItem = item as InvidiousPlaylistResult;
          return {
            title: playlistItem.title,
            stats: `${playlistItem.videoCount} streams`,
            thumbnail: playlistItem.playlistThumbnail,
            uploaderData: playlistItem.author,
            url: `/playlist/${playlistItem.playlistId}`,
            type: 'playlist',
          } as YTListItem;
        }
      });
    });
};
