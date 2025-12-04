import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import * as cheerio from 'cheerio';
import { PlatformContent } from '../types';
import { logger } from '../utils/logger';

const parser = new XMLParser();

// List of Nitter instances (Twitter proxies)
const NITTER_INSTANCES = [
  'https://nitter.net',
  'https://nitter.cz',
  'https://nitter.privacydev.net',
  'https://nitter.poast.org',
  'https://nitter.snopyta.org'
];

/**
 * Fetch Twitter/X content using Nitter instances (public Twitter proxy)
 */
export async function fetchContent(
  _profileUrl: string,
  profileHandle: string
): Promise<PlatformContent[]> {
  // Remove @ if present
  const handle = profileHandle.replace(/^@/, '');

  // Try multiple Nitter instances
  for (const instance of NITTER_INSTANCES) {
    try {
      const content = await fetchFromNitter(instance, handle);
      if (content.length > 0) {
        logger.info('Twitter fetch success', { handle, instance });
        return content;
      }
    } catch (error: any) {
      logger.warn('Nitter instance failed', {
        instance,
        handle,
        error: error.message
      });
      continue; // Try next instance
    }
  }

  throw new Error('All Nitter instances failed');
}

/**
 * Fetch from a specific Nitter instance using RSS
 */
async function fetchFromNitter(instance: string, handle: string): Promise<PlatformContent[]> {
  try {
    const rssUrl = `${instance}/${handle}/rss`;

    const response = await axios.get(rssUrl, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const data = parser.parse(response.data);

    if (!data.rss?.channel?.item) {
      return [];
    }

    const items = Array.isArray(data.rss.channel.item)
      ? data.rss.channel.item
      : [data.rss.channel.item];

    return items.slice(0, 20).map((item: any) => {
      // Extract tweet ID from link
      const tweetId = extractTweetId(item.link);

      // Convert Nitter link to Twitter link
      const twitterUrl = item.link.replace(instance, 'https://twitter.com').replace('https://nitter.net', 'https://twitter.com');

      // Extract image from description HTML if available
      const mediaUrl = extractMediaUrl(item.description);

      return {
        id: tweetId,
        platform: 'twitter',
        title: item.title || null,
        description: stripHtml(item.description) || null,
        url: twitterUrl,
        media_url: mediaUrl,
        type: 'tweet' as const,
        published_at: new Date(item.pubDate)
      };
    });
  } catch (error: any) {
    throw new Error(`Nitter fetch failed: ${error.message}`);
  }
}

/**
 * Extract tweet ID from Nitter URL
 */
function extractTweetId(url: string): string {
  const match = url.match(/\/status\/(\d+)/);
  return match ? match[1] : url;
}

/**
 * Extract first image URL from HTML description
 */
function extractMediaUrl(html: string): string | null {
  try {
    const $ = cheerio.load(html);
    const img = $('img').first().attr('src');
    return img || null;
  } catch {
    return null;
  }
}

/**
 * Strip HTML tags from description
 */
function stripHtml(html: string): string | null {
  try {
    const $ = cheerio.load(html);
    return $.text().trim() || null;
  } catch {
    return null;
  }
}

/**
 * Alternative: Fetch from Twitter HTML (less reliable, no auth)
 */
export async function fetchFromTwitterHtml(handle: string): Promise<PlatformContent[]> {
  try {
    const url = `https://twitter.com/${handle}`;

    await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    // This would require parsing JavaScript-rendered content
    // Twitter now heavily uses client-side rendering, making scraping difficult
    // This is why we use Nitter instead

    throw new Error('Direct Twitter HTML scraping not supported (use Nitter)');
  } catch (error: any) {
    throw new Error(`Twitter HTML fetch failed: ${error.message}`);
  }
}
