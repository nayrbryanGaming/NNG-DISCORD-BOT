// Reddit Fetcher
// Uses Reddit's public JSON API (no authentication required for public content)

import axios, { AxiosError } from 'axios';
import { PlatformContent } from '../types';
import { logger } from '../utils/logger';

interface RedditPost {
  kind: string;
  data: {
    id: string;
    title: string;
    selftext: string;
    url: string;
    permalink: string;
    created_utc: number;
    is_video: boolean;
    media?: {
      reddit_video?: {
        fallback_url: string;
      };
    };
    thumbnail: string;
  };
}

/**
 * Fetch Reddit user posts or subreddit posts
 * Supports: /u/username or /r/subreddit
 */
export async function fetchContent(profileUrl: string, _profileHandle: string): Promise<PlatformContent[]> {
  try {
    const { type, name } = parseRedditUrl(profileUrl);

    if (!type || !name) {
      throw new Error(`Invalid Reddit URL: ${profileUrl}`);
    }

    logger.debug(`Fetching Reddit ${type}: ${name}`);

    const endpoint = type === 'user' 
      ? `https://www.reddit.com/user/${name}/new.json`
      : `https://www.reddit.com/r/${name}/new.json`;

    const response = await axios.get(endpoint, {
      headers: {
        'User-Agent': 'Social-Media-Watcher-Bot/1.0 (Discord bot for monitoring Reddit)',
      },
      params: {
        limit: 10, // Fetch last 10 posts
      },
      timeout: 10000,
    });

    const posts: PlatformContent[] = [];

    // Parse Reddit API response
    if (response.data?.data?.children) {
      response.data.data.children.forEach((item: RedditPost) => {
        if (item.kind === 't3' && item.data) {
          const postData = item.data;
          
          posts.push({
            id: postData.id,
            platform: 'reddit',
            type: postData.is_video ? 'video' : 'post',
            title: postData.title,
            description: postData.selftext.substring(0, 300), // Truncate long text
            url: `https://www.reddit.com${postData.permalink}`,
            media_url: postData.thumbnail !== 'self' ? postData.thumbnail : null,
            published_at: new Date(postData.created_utc * 1000),
          });
        }
      });
    }

    logger.info(`✅ Found ${posts.length} Reddit posts from ${type}/${name}`);
    return posts;

  } catch (error) {
    const axiosError = error as AxiosError;
    if (axiosError.response?.status === 404) {
      logger.warn(`Reddit ${profileUrl} not found (404)`);
    } else {
      logger.error(`Error fetching Reddit: ${axiosError.message}`);
    }
    return [];
  }
}

/**
 * Parse Reddit URL to extract type (user/subreddit) and name
 */
function parseRedditUrl(url: string): { type: string | null; name: string | null } {
  // Handle: reddit.com/u/username or reddit.com/r/subreddit
  const userMatch = url.match(/reddit\.com\/u(?:ser)?\/([a-zA-Z0-9_-]+)\/?/i);
  if (userMatch) {
    return { type: 'user', name: userMatch[1] };
  }

  const subredditMatch = url.match(/reddit\.com\/r\/([a-zA-Z0-9_-]+)\/?/i);
  if (subredditMatch) {
    return { type: 'subreddit', name: subredditMatch[1] };
  }

  // Also handle short /u/ and /r/ notation
  const shortUserMatch = url.match(/\/u\/([a-zA-Z0-9_-]+)\/?/i);
  if (shortUserMatch) {
    return { type: 'user', name: shortUserMatch[1] };
  }

  const shortSubMatch = url.match(/\/r\/([a-zA-Z0-9_-]+)\/?/i);
  if (shortSubMatch) {
    return { type: 'subreddit', name: shortSubMatch[1] };
  }

  return { type: null, name: null };
}

/**
 * Fetch new posts from a specific subreddit
 */
export async function fetchRedditSubreddit(
  subredditName: string,
  sort: 'new' | 'hot' | 'top' = 'new'
): Promise<PlatformContent[]> {
  try {
    const response = await axios.get(`https://www.reddit.com/r/${subredditName}/${sort}.json`, {
      headers: {
        'User-Agent': 'Social-Media-Watcher-Bot/1.0',
      },
      params: { limit: 10 },
      timeout: 10000,
    });

    return response.data?.data?.children
      ?.map((item: RedditPost) => {
        if (item.kind === 't3') {
          const data = item.data;
          return {
            id: data.id,
            platform: 'reddit',
            type: data.is_video ? 'video' : 'post',
            title: data.title,
            description: data.selftext.substring(0, 300),
            url: `https://www.reddit.com${data.permalink}`,
            media_url: data.thumbnail !== 'self' ? data.thumbnail : undefined,
            timestamp: new Date(data.created_utc * 1000),
            author: subredditName,
          };
        }
        return null;
      })
      .filter(Boolean) || [];

  } catch (error) {
    logger.error(`Error fetching Reddit subreddit ${subredditName}:`, error);
    return [];
  }
}
