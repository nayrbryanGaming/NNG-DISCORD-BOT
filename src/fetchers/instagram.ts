// Instagram Fetcher
// Note: Instagram is very restrictive and doesn't provide public RSS feeds
// This implementation uses Instagram's public graph API endpoint approach (limited)
// For production, this may require periodic HTML scraping of public profiles

import axios, { AxiosError } from 'axios';
import * as cheerio from 'cheerio';
import { PlatformContent } from '../types';
import { logger } from '../utils/logger';

// Instagram doesn't expose a public JSON API anymore
// We'll parse the public profile page's embedded JSON data

/**
 * Extract Instagram posts from public profile page
 * Limitation: Can only get posts visible in initial page load (usually ~12 posts)
 */
export async function fetchContent(profileUrl: string, _profileHandle: string): Promise<PlatformContent[]> {
  try {
    // Extract username from URL
    const username = extractUsernameFromUrl(profileUrl);
    if (!username) {
      throw new Error(`Invalid Instagram URL: ${profileUrl}`);
    }

    logger.debug(`Fetching Instagram profile: @${username}`);

    // Fetch the public profile page
    const response = await axios.get(`https://www.instagram.com/${username}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 10000,
    });

    // Extract JSON data embedded in HTML
    // Instagram embeds initial data in a script tag
    const match = response.data.match(
      /<script type="application\/ld\+json">({.*?})<\/script>/
    );

    if (!match) {
      logger.warn(`Could not find Instagram JSON data for @${username}`);
      return [];
    }

    // Parse the initial state JSON (contains posts)
    const scriptMatch = response.data.match(
      /window\._sharedData\s*=\s*({.*?});<\/script>/
    );

    if (!scriptMatch) {
      logger.debug('Could not extract Instagram shared data');
      return parseBasicInstagramData(response.data, username);
    }

    const sharedData = JSON.parse(scriptMatch[1]);
    const posts: PlatformContent[] = [];

    // Extract posts from the profile
    const profileData = sharedData?.entry_data?.ProfilePage?.[0]?.graphql?.user;
    if (!profileData?.edge_owner_to_timeline_media?.edges) {
      return [];
    }

    const edges = profileData.edge_owner_to_timeline_media.edges;

    edges.forEach((edge: any) => {
      const node = edge.node;
      const post: PlatformContent = {
        id: node.id,
        platform: 'instagram',
        type: node.is_video ? 'video' : 'post',
        title: node.caption || `${username}'s post`,
        description: node.edge_media_to_caption?.edges?.[0]?.node?.text || '',
        url: `https://www.instagram.com/p/${node.shortcode}/`,
        media_url: node.display_url,
        published_at: new Date(node.taken_at_timestamp * 1000),
      };
      posts.push(post);
    });

    logger.info(`✅ Found ${posts.length} Instagram posts from @${username}`);
    return posts;

  } catch (error) {
    const axiosError = error as AxiosError;
    logger.error(`Error fetching Instagram: ${axiosError.message}`);
    throw error;
  }
}

/**
 * Fallback: Parse basic Instagram data from HTML
 */
function parseBasicInstagramData(html: string, username: string): PlatformContent[] {
  const $ = cheerio.load(html);
  const posts: PlatformContent[] = [];

  // This is a fallback and may not work due to Instagram's changes
  // It attempts to find post links in the page
  $('a[href*="/p/"]').slice(0, 5).each((_i: number, elem: any) => {
    const href = $(elem).attr('href');
    if (href) {
      const shortcode = href.split('/p/')[1]?.replace('/', '');
      if (shortcode) {
        posts.push({
          id: shortcode,
          platform: 'instagram',
          type: 'post' as const,
          title: `${username}'s post`,
          description: 'View on Instagram',
          url: `https://www.instagram.com/p/${shortcode}/`,
          media_url: null,
          published_at: new Date(),
        });
      }
    }
  });

  return posts;
}

/**
 * Extract Instagram username from various URL formats
 */
function extractUsernameFromUrl(url: string): string | null {
  // Handle: instagram.com/username, www.instagram.com/username, https://instagram.com/username
  const match = url.match(/instagram\.com\/([a-zA-Z0-9._-]+)\/?/i);
  if (match) {
    const username = match[1];
    // Remove query parameters or trailing content
    return username.split('?')[0];
  }
  return null;
}

/**
 * Get Instagram profile ID (internal ID)
 * Note: This requires the profile to be fetched first
 */
export async function getInstagramProfileId(username: string): Promise<string | null> {
  try {
    const response = await axios.get(`https://www.instagram.com/${username}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 10000,
    });

    // Instagram profile has user ID in the page
    const match = response.data.match(/"id":"(\d+)"/);
    if (match) {
      return match[1];
    }

    return null;
  } catch (error) {
    logger.error('Error getting Instagram profile ID:', error);
    return null;
  }
}
