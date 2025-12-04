import { db } from '../index';
import { logger } from './logger';
import { TIER_LIMITS } from '../types';

/**
 * Get or create a guild in the database
 */
export async function getOrCreateGuild(guildId: string, guildName: string = 'Unknown Guild') {
  return db.guild.upsert({
    where: { id: guildId },
    update: {},
    create: {
      id: guildId,
      name: guildName
    }
  });
}

/**
 * Get or create a user in the database
 */
export async function getOrCreateUser(userId: string, username: string = 'Unknown User') {
  return db.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      username
    }
  });
}

/**
 * Check if a guild is premium
 */
export async function isPremium(guildId: string): Promise<boolean> {
  const guild = await db.guild.findUnique({
    where: { id: guildId },
    select: { premium_expires: true }
  });

  if (!guild) return false;
  if (!guild.premium_expires) return false;

  return guild.premium_expires > new Date();
}

/**
 * Get the tier limits for a guild
 */
export async function getTierLimits(guildId: string) {
  const premium = await isPremium(guildId);
  return premium ? TIER_LIMITS.premium : TIER_LIMITS.free;
}

/**
 * Check if a guild can add more links
 */
export async function canAddMoreLinks(guildId: string): Promise<{ can: boolean; used: number; limit: number }> {
  const limits = await getTierLimits(guildId);
  const used = await db.link.count({
    where: { guild_id: guildId }
  });

  return {
    can: used < limits.max_links,
    used,
    limit: limits.max_links
  };
}

/**
 * Validate a social media URL and extract profile info
 */
export async function validateAndParseUrl(
  platform: string,
  url: string
): Promise<{ handle: string; profile_id?: string } | null> {
  try {
    switch (platform.toLowerCase()) {
      case 'youtube':
        return parseYouTubeUrl(url);
      case 'twitter':
      case 'x':
        return parseTwitterUrl(url);
      case 'instagram':
        return parseInstagramUrl(url);
      case 'reddit':
        return parseRedditUrl(url);
      case 'telegram':
        return parseTelegramUrl(url);
      case 'tiktok':
        return parseTikTokUrl(url);
      default:
        return null;
    }
  } catch (error) {
    logger.warn(`Invalid URL for platform ${platform}`, { url, error });
    return null;
  }
}

// ===== URL PARSERS =====

function parseYouTubeUrl(url: string): { handle: string; profile_id?: string } | null {
  const patterns = [
    /youtube\.com\/@([a-zA-Z0-9_-]+)/i,
    /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/i,
    /youtube\.com\/user\/([a-zA-Z0-9_-]+)/i,
    /youtu\.be\/([a-zA-Z0-9_-]+)/i,
    /youtube\.com\/c\/([a-zA-Z0-9_-]+)/i
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return { handle: match[1] };
    }
  }

  return null;
}

function parseTwitterUrl(url: string): { handle: string } | null {
  const patterns = [
    /(?:twitter|x)\.com\/([a-zA-Z0-9_]+)(?:\/|$)/i,
    /twitter\.com\/([a-zA-Z0-9_]+)(?:\/|$)/i,
    /x\.com\/([a-zA-Z0-9_]+)(?:\/|$)/i
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return { handle: match[1] };
    }
  }

  return null;
}

function parseInstagramUrl(url: string): { handle: string } | null {
  const match = url.match(/instagram\.com\/([a-zA-Z0-9_.]+)(?:\/|$)/i);
  return match ? { handle: match[1] } : null;
}

function parseRedditUrl(url: string): { handle: string } | null {
  const patterns = [/reddit\.com\/user\/([a-zA-Z0-9_-]+)/i, /reddit\.com\/r\/([a-zA-Z0-9_-]+)/i];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return { handle: match[1] };
    }
  }

  return null;
}

function parseTelegramUrl(url: string): { handle: string } | null {
  const match = url.match(/t\.me\/([a-zA-Z0-9_]+)(?:\/|$)/i);
  return match ? { handle: match[1] } : null;
}

function parseTikTokUrl(url: string): { handle: string } | null {
  const patterns = [/tiktok\.com\/@([a-zA-Z0-9_.-]+)/i, /vm\.tiktok\.com\/([a-zA-Z0-9]+)/i];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return { handle: match[1] };
    }
  }

  return null;
}
