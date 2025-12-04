// Telegram Fetcher
// Monitors public Telegram channels and groups using Telegram Bot API

import axios, { AxiosError } from 'axios';
import { PlatformContent } from '../types';
import { logger } from '../utils/logger';

interface TelegramMessage {
  message_id: number;
  date: number;
  text?: string;
  caption?: string;
  photo?: Array<{ file_id: string }>;
  video?: { file_id: string };
}

interface TelegramResponse {
  ok: boolean;
  result?: TelegramMessage[];
  error_code?: number;
  description?: string;
}

/**
 * Fetch messages from a public Telegram channel
 * Supports: t.me/channelname or @channelname
 * 
 * Note: Requires TELEGRAM_BOT_TOKEN to be set in environment
 * Free approach: Parses public channel links (limited functionality)
 * For full monitoring, consider using telegram-cli or official Telegram API
 */
export async function fetchContent(profileUrl: string, _profileHandle: string): Promise<PlatformContent[]> {
  try {
    const channelName = extractChannelName(profileUrl);
    if (!channelName) {
      throw new Error(`Invalid Telegram URL: ${profileUrl}`);
    }

    logger.debug(`Fetching Telegram channel: ${channelName}`);

    // Method 1: Try using Telegram Bot API (requires bot token in channel)
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      const botMessages = await fetchViaTelegramBot(channelName);
      if (botMessages.length > 0) {
        return botMessages;
      }
    }

    // Method 2: Parse public Telegram Web link (best effort)
    const webMessages = await fetchViaTelegramWeb(channelName);
    return webMessages;

  } catch (error) {
    const axiosError = error as AxiosError;
    logger.error(`Error fetching Telegram: ${axiosError.message}`);
    return [];
  }
}

/**
 * Fetch messages using Telegram Bot API
 * Requires: Bot added to channel with admin privileges, and TELEGRAM_BOT_TOKEN set
 */
async function fetchViaTelegramBot(channelName: string): Promise<PlatformContent[]> {
  try {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      return [];
    }

    // Normalize channel name (remove @ if present)
    const normalizedName = channelName.startsWith('@') ? channelName : `@${channelName}`;

    const response = await axios.post(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getUpdates`,
      {
        chat_id: normalizedName,
        limit: 10,
        timeout: 10000,
      }
    );

    const telegramResponse = response.data as TelegramResponse;

    if (!telegramResponse.ok || !telegramResponse.result) {
      logger.debug(`Telegram Bot API error: ${telegramResponse.description}`);
      return [];
    }

    const posts = telegramResponse.result.map(msg => ({
      id: `telegram_${msg.message_id}`,
      platform: 'telegram',
      type: msg.video ? 'video' : msg.photo ? 'photo' : 'post',
      title: `${channelName} message`,
      description: msg.text || msg.caption || 'View on Telegram',
      url: `https://t.me/${channelName.replace('@', '')}/messages/${msg.message_id}`,
      media_url: null,
      published_at: new Date(msg.date * 1000),
    })) as PlatformContent[];

    logger.info(`✅ Found ${posts.length} Telegram messages from ${channelName}`);
    return posts;

  } catch (error) {
    logger.debug('Error fetching via Telegram Bot API:', error);
    return [];
  }
}

/**
 * Fetch messages from public Telegram channel via web parsing
 * This is a limited approach and may be fragile if Telegram changes structure
 */
async function fetchViaTelegramWeb(channelName: string): Promise<PlatformContent[]> {
  try {
    const normalizedName = channelName.startsWith('@') ? channelName.slice(1) : channelName;
    
    // Telegram Web
    const url = `https://t.me/${normalizedName}`;

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 10000,
    });

    const posts: PlatformContent[] = [];

    // Try to extract message data from HTML
    // This is fragile and may break when Telegram updates their web UI
    const messageMatches = response.data.match(/tgme_widget_message(?:_text)?[^>]*>([^<]+)</g);

    if (messageMatches) {
      messageMatches.slice(0, 5).forEach((match: string, index: number) => {
        const text = match.replace(/tgme_widget_message[^>]*>/, '').replace(/<.*$/, '');
        posts.push({
          id: `telegram_web_${Date.now()}_${index}`,
          platform: 'telegram',
          type: 'post' as const,
          title: `${normalizedName} message`,
          description: text.substring(0, 300),
          url: url,
          media_url: null,
          published_at: new Date(),
        });
      });
    }

    if (posts.length === 0) {
      logger.info(`⚠️  Could not fetch Telegram messages (channel may be private or restricted)`);
    } else {
      logger.info(`✅ Found ${posts.length} Telegram messages from @${normalizedName}`);
    }

    return posts;

  } catch (error) {
    logger.debug('Error fetching Telegram via web:', error);
    return [];
  }
}

/**
 * Extract channel name from various Telegram URL formats
 */
function extractChannelName(url: string): string | null {
  // Handle: t.me/channelname, @channelname, or https://t.me/channelname
  const match = url.match(/(?:t\.me\/|@)([a-zA-Z0-9_]{5,})\/?/i);
  if (match) {
    return match[1];
  }

  return null;
}

/**
 * Get information about a Telegram channel
 * Requires valid Telegram Bot token
 */
export async function getTelegramChannelInfo(
  channelName: string
): Promise<{ title: string; description?: string } | null> {
  try {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      return null;
    }

    const normalizedName = channelName.startsWith('@') ? channelName : `@${channelName}`;

    const response = await axios.post(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getChat`,
      { chat_id: normalizedName }
    );

    if (response.data.ok && response.data.result) {
      return {
        title: response.data.result.title,
        description: response.data.result.description,
      };
    }

    return null;
  } catch (error) {
    logger.debug('Error getting Telegram channel info:', error);
    return null;
  }
}
