// Type definitions for the Discord bot

export interface PlatformContent {
  id: string;
  platform: string;
  title: string | null;
  description: string | null;
  url: string;
  media_url: string | null;
  type: ContentType;
  published_at: Date;
}

export type ContentType = 'post' | 'video' | 'tweet' | 'reel' | 'live_start' | 'story' | 'photo';

export type Platform = 'youtube' | 'twitter' | 'instagram' | 'reddit' | 'telegram' | 'tiktok';

export interface LinkConfiguration {
  platform: Platform;
  profile_url: string;
  content_types: ContentType[];
}

export interface GuildSettings {
  announcement_channel: string | null;
  timezone: string;
  announcement_mode: 'instant' | 'summary';
  summary_interval: number;
}

export interface PremiumTierLimits {
  max_links: number;
  check_interval_minutes: number;
  supported_platforms: Platform[];
}

export const TIER_LIMITS = {
  free: {
    max_links: 3,
    check_interval_minutes: 10,
    supported_platforms: ['youtube', 'twitter'] as Platform[]
  },
  premium: {
    max_links: 50,
    check_interval_minutes: 1,
    supported_platforms: ['youtube', 'twitter', 'instagram', 'reddit', 'telegram', 'tiktok'] as Platform[]
  }
} as const;

export const PLATFORM_ICONS: Record<Platform, string> = {
  youtube: '🎬',
  twitter: '𝕏',
  instagram: '📷',
  reddit: '🔴',
  telegram: '📱',
  tiktok: '🎵'
};

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  post: 'Post',
  video: 'Video',
  tweet: 'Tweet',
  reel: 'Reel',
  live_start: 'Live Stream',
  story: 'Story',
  photo: 'Photo'
};
