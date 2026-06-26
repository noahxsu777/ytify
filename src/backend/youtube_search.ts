const YOUTUBE_MUSIC_SEARCH_URL = 'https://music.youtube.com/youtubei/v1/search';
const INNERTUBE_SEARCH_URL = 'https://youtubei.googleapis.com/youtubei/v1/search';

const SEARCH_PARAMS = {
  songs: 'Eg-KAQwIARAA',
  videos: 'Eg-KAQwIAxAA',
  albums: 'Eg-KAQwIYxAA',
  artists: 'Eg-KAQwIgxAA',
  playlists: 'Eg-KAQwIzhAA'
};

// Primary search: YouTube InnerTube WEB client via googleapis.com.
// This endpoint is reachable from serverless IPs (unlike music.youtube.com,
// which often gets blocked), and returns the stable videoRenderer structure.
async function searchInnertube(query: string): Promise<YTStreamItem[]> {
  const res = await fetch(INNERTUBE_SEARCH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      context: { client: { clientName: 'WEB', clientVersion: '2.20240814.00.00', hl: 'en', gl: 'US' } },
      query,
    }),
  });
  if (!res.ok) throw new Error(`innertube search ${res.status}`);
  const data = await res.json();

  const sections = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
  const results: YTStreamItem[] = [];

  for (const section of sections) {
    const items = section?.itemSectionRenderer?.contents;
    if (!items) continue;
    for (const item of items) {
      const v = item.videoRenderer;
      if (!v?.videoId) continue;
      const title = v.title?.runs?.[0]?.text;
      const ownerRun = v.ownerText?.runs?.[0] || v.longBylineText?.runs?.[0];
      const author = ownerRun?.text || '';
      const authorId = ownerRun?.navigationEndpoint?.browseEndpoint?.browseId || '';
      const duration = v.lengthText?.simpleText || '';
      const views = v.viewCountText?.simpleText || '';
      const uploaded = v.publishedTimeText?.simpleText || '';
      if (!title || !duration) continue; // skip live/upcoming with no duration
      results.push({
        id: v.videoId,
        title,
        author,
        duration,
        authorId,
        views,
        img: v.videoId,
        uploaded,
        type: 'video',
      } as YTStreamItem);
    }
  }
  return results;
}

export async function searchYouTubeMusic(query: string, filter: string): Promise<(YTStreamItem | YTListItem)[]> {
  // Try the reliable InnerTube WEB search first.
  try {
    const r = await searchInnertube(query);
    if (r.length) return r;
  } catch (e) {
    console.error('InnerTube search failed, falling back to music.youtube:', e);
  }
  return searchYouTubeMusicLegacy(query, filter);
}

async function searchYouTubeMusicLegacy(query: string, filter: string): Promise<(YTStreamItem | YTListItem)[]> {
  const param = SEARCH_PARAMS[filter as keyof typeof SEARCH_PARAMS] || '';
  
  const requestBody = {
    context: {
      client: {
        clientName: 'WEB_REMIX',
        clientVersion: '1.20250929.03.00',
        gl: 'US',
        hl: 'en'
      }
    },
    query: query,
    params: param
  };

  try {
    const response = await fetch(YOUTUBE_MUSIC_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      console.error(`HTTP error! Status: ${response.status}`);
      return [];
    }

    const data = await response.json();
    
    // Navigate to the list of items
    let contents = data.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents;
    
    if (!contents) return [];

    // If unfiltered or sometimes filtered, it might have multiple sections (shelves)
    // For filtered, it's usually one musicShelfRenderer
    let listItems: any[] = [];
    
    for (const section of contents) {
        if (section.musicShelfRenderer) {
            listItems = [...listItems, ...section.musicShelfRenderer.contents];
        }
    }

    const results: (YTStreamItem | YTListItem)[] = [];

    for (const item of listItems) {
      const renderer = item.musicResponsiveListItemRenderer;
      if (!renderer) continue;

      // Extract basic info
      const flexColumns = renderer.flexColumns;
      const titleColumn = flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer;
      const metaColumn = flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer;

      const title = titleColumn?.text?.runs?.[0]?.text;
      if (!title) continue;

      const thumbnail = renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.pop()?.url || '';

      // Determine type and IDs
      let id = '';
      let type = '';

      const navigationEndpoint = titleColumn.text.runs[0].navigationEndpoint;
      if (navigationEndpoint?.watchEndpoint) {
        id = navigationEndpoint.watchEndpoint.videoId;
        type = (filter === 'videos') ? 'video' : 'stream';
      } else if (navigationEndpoint?.browseEndpoint) {
        id = navigationEndpoint.browseEndpoint.browseId;
        const pageType = navigationEndpoint.browseEndpoint.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType;
        if (pageType === 'MUSIC_PAGE_TYPE_ALBUM') type = 'playlist'; // Mapped to playlist type but URL is /album/
        else if (pageType === 'MUSIC_PAGE_TYPE_ARTIST') type = 'channel';
        else if (pageType === 'MUSIC_PAGE_TYPE_PLAYLIST') type = 'playlist';
        
        // Fallback based on filter or id
        if (!type) {
            if (id.startsWith('MPRE') || id.startsWith('OLAK')) type = 'playlist'; // Album
            else if (id.startsWith('UC')) type = 'channel';
            else if (id.startsWith('VL') || id.startsWith('PL')) type = 'playlist';
        }
      }

      if (!id) continue;

      // Metadata parsing (Artist, Album, Duration, Views)
      let author = '';
      let authorId = '';
      let duration = '';
      let views = '';
      let albumId = '';
      let year = '';
      let itemCount = '';

      if (metaColumn?.text?.runs) {
        const runs = metaColumn.text.runs;
        
        // Strategy: iterate runs and look for known patterns
        // Artist usually has navigationEndpoint to browseId (channel)
        // Duration is matching \d+:\d+
        // Views ends with 'views'
        // Year matches \d{4}
        
        for (const run of runs) {
            if (run.navigationEndpoint?.browseEndpoint) {
                const bid = run.navigationEndpoint.browseEndpoint.browseId;
                if ((bid.startsWith('UC') || bid.startsWith('FEmusic_library_privately_owned_artist_detail')) && !author) {
                    author = run.text;
                    authorId = bid;
                } else if (bid.startsWith('MPRE') || bid.startsWith('OLAK')) {
                    // Album link
                    albumId = bid;
                }
            }
            
            if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(run.text)) {
                duration = run.text;
            } else if (run.text.includes('views') || run.text.includes('plays')) {
                views = run.text;
            } else if (/^\d{4}$/.test(run.text)) {
                year = run.text;
            } else if (run.text.includes('song')) {
                itemCount = run.text; // roughly
            }
        }
      }

      // Specific adjustments based on type
      if (type === 'stream' || type === 'video') {
         results.push({
             id,
             title,
             author: author + (type === 'stream' ? ' - Topic' : ''),
             duration,
             authorId,
             views: views || (albumId ? 'Album track' : ''), // Fallback
             img: id, // Logic in frontend handles fetching image from ID if needed, or we pass url? Frontend expects 'img' as ID usually for streams
             albumId,
             type: type as 'stream' | 'video'
         });
      } else if (type === 'playlist') {
          // Check if it's an album
          const isAlbum = id.startsWith('MPRE') || id.startsWith('OLAK') || filter === 'albums';
          results.push({
              title,
              stats: year || itemCount || views || '', // Year for albums, item count/views for playlists
              thumbnail,
              uploaderData: author,
              url: isAlbum ? `/album/${id}` : `/playlists/${id}`,
              type: 'playlist'
          });
      } else if (type === 'channel') {
           results.push({
              title,
              stats: 'Artist', // or subscribers if available
              thumbnail,
              uploaderData: 'Artist',
              url: `/artist/${id}`,
              type: 'channel'
          });
      }
    }

    return results;

  } catch (error) {
    console.error('Error in searchYouTubeMusic:', error);
    return [];
  }
}