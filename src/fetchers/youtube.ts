import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { PlatformContent } from '../types';
import { logger } from '../utils/logger';

const parser = new XMLParser();

/**
 * Fetch YouTube content using RSS feed and optionally YouTube Data API v3
 */
export async function fetchContent(
  profileUrl: string,
  profileHandle: string,
  profileId?: string
): Promise<PlatformContent[]> {
  try {
    // If we don't have channel ID, resolve it first
    if (!profileId) {
      profileId = await resolveChannelId(profileHandle, profileUrl);
    }

    // Use RSS feed (free, no API key needed, reliable)
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${profileId}`;

    const response = await axios.get(rssUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const data = parser.parse(response.data);

    if (!data.feed?.entry) {
      return [];
    }

    // RSS returns up to 15 most recent videos
    const entries = Array.isArray(data.feed.entry) ? data.feed.entry : [data.feed.entry];

    return entries.map((entry: any) => ({
      id: entry['yt:videoId'],
      platform: 'youtube',
      title: entry.title || null,
      description: entry['media:group']?.['media:description'] || null,
      url: `https://youtube.com/watch?v=${entry['yt:videoId']}`,
      media_url: entry['media:group']?.['media:thumbnail']?.['@_url'] || null,
      type: 'video' as const,
      published_at: new Date(entry.published)
    }));
  } catch (error: any) {
    logger.error('YouTube fetch error', {
      handle: profileHandle,
      error: error.message
    });
    throw new Error(`Failed to fetch YouTube content: ${error.message}`);
  }
}

/**
 * Resolve YouTube channel ID from handle or URL
 */
async function resolveChannelId(handle: string, url: string): Promise<string> {
  try {
    // Try to extract from URL patterns
    const patterns = [
      /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/i,
      /youtube\.com\/c\/([a-zA-Z0-9_-]+)/i
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    // For @handle URLs, scrape the channel page
    if (url.includes('/@')) {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      // Look for channel ID in HTML
      const channelIdMatch = response.data.match(/"channelId":"([^"]+)"/);
      if (channelIdMatch) {
        return channelIdMatch[1];
      }

      const externalIdMatch = response.data.match(/"externalId":"([^"]+)"/);
      if (externalIdMatch) {
        return externalIdMatch[1];
      }
    }

    throw new Error('Could not resolve YouTube channel ID');
  } catch (error: any) {
    logger.error('YouTube channel ID resolution error', {
      handle,
      url,
      error: error.message
    });
    throw new Error(`Failed to resolve YouTube channel ID: ${error.message}`);
  }
}

/**
 * Optional: Fetch live streams using YouTube Data API v3 (requires API key)
 */
export async function fetchLiveStreams(channelId: string): Promise<PlatformContent[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    logger.warn('YouTube API key not configured, skipping live stream check');
    return [];
  }

  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        channelId: channelId,
        eventType: 'live',
        type: 'video',
        key: apiKey
      },
      timeout: 10000
    });

    if (!response.data.items || response.data.items.length === 0) {
      return [];
    }

    return response.data.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      url: `https://youtube.com/watch?v=${item.id.videoId}`,
      media_url: item.snippet.thumbnails?.medium?.url || null,
      type: 'live_start' as const,
      published_at: new Date(item.snippet.publishedAt)
    }));
  } catch (error: any) {
    logger.error('YouTube live stream fetch error', {
      channelId,
      error: error.message
    });
    return [];
  }
}
