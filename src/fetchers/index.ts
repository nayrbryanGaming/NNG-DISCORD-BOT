// Fetcher Index - Export all platform fetchers
import { PlatformContent, Platform } from '../types';

export interface PlatformFetcher {
  fetchContent: (profileUrl: string, profileHandle: string, profileId?: string) => Promise<PlatformContent[]>;
}

import * as youtube from './youtube';
import * as twitter from './twitter';
import * as instagram from './instagram';
import * as tiktok from './tiktok';
import * as reddit from './reddit';
import * as telegram from './telegram';

const fetchers: Record<Platform, PlatformFetcher | null> = {
  youtube: youtube as unknown as PlatformFetcher,
  twitter: twitter as unknown as PlatformFetcher,
  instagram: instagram as unknown as PlatformFetcher,
  reddit: reddit as unknown as PlatformFetcher,
  telegram: telegram as unknown as PlatformFetcher,
  tiktok: tiktok as unknown as PlatformFetcher
};

export async function fetchPlatformContent(
  platform: Platform,
  profileUrl: string,
  profileHandle: string,
  profileId?: string
): Promise<PlatformContent[]> {
  const fetcher = fetchers[platform];

  if (!fetcher) {
    throw new Error(`Fetcher not implemented for platform: ${platform}`);
  }

  // Call the appropriate fetch function based on platform
  switch (platform) {
    case 'youtube':
      return youtube.fetchContent(profileUrl, profileHandle, profileId);
    case 'twitter':
      return twitter.fetchContent(profileUrl, profileHandle);
    case 'instagram':
      return instagram.fetchContent(profileUrl, profileHandle);
    case 'tiktok':
      return tiktok.fetchContent(profileUrl, profileHandle);
    case 'reddit':
      return reddit.fetchContent(profileUrl, profileHandle);
    case 'telegram':
      return telegram.fetchContent(profileUrl, profileHandle);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

export { youtube, twitter, instagram, tiktok, reddit, telegram };
