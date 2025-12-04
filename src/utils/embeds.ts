import { EmbedBuilder, Colors } from 'discord.js';
import { LinkEvent, Link } from '@prisma/client';
import { PLATFORM_ICONS, CONTENT_TYPE_LABELS, ContentType } from '../types';

/**
 * Create an announcement embed for a new piece of content
 */
export function createAnnouncementEmbed(
  link: Link & { guild: { name: string } },
  event: LinkEvent
): EmbedBuilder {
  const platform = link.platform as keyof typeof PLATFORM_ICONS;
  const icon = PLATFORM_ICONS[platform] || '📌';
  const contentType = event.content_type as ContentType;
  const contentLabel = CONTENT_TYPE_LABELS[contentType] || event.content_type;

  const embed = new EmbedBuilder()
    .setTitle(`${icon} New ${contentLabel} from ${link.profile_handle}`)
    .setDescription(event.title || event.description || 'No description available')
    .setURL(event.url)
    .setColor(Colors.Blurple)
    .setTimestamp(event.published_at);

  if (event.media_url) {
    embed.setThumbnail(event.media_url);
  }

  // Add footer with source
  embed.setFooter({
    text: `${link.profile_handle} on ${link.platform}`,
    iconURL: undefined
  });

  return embed;
}

/**
 * Create a status embed showing all tracked links for a guild
 */
export function createLinkListEmbed(
  links: (Link & { events: LinkEvent[] })[]
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle('🔗 Tracked Links')
    .setColor(Colors.Green)
    .setTimestamp();

  if (links.length === 0) {
    embed.setDescription('No links being tracked. Use `/link add` to get started!');
    return embed;
  }

  const description = links
    .map((link, idx) => {
      const statusEmoji = link.status === 'active' ? '✅' : '❌';
      const platform = link.platform.toUpperCase();
      const handle = link.profile_handle;
      const types = link.content_types || 'all';
      
      return `${idx + 1}. ${statusEmoji} **[${platform}] ${handle}**\n   ID: \`${link.id.substring(0, 8)}\`\n   Types: ${types}`;
    })
    .join('\n\n');

  embed.setDescription(description);
  embed.setFooter({ text: `Total: ${links.length} links` });

  return embed;
}

/**
 * Create a welcome/start embed
 */
export function createStartEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('👋 Welcome to Social Media Watcher!')
    .setDescription(
      'I automatically monitor social media profiles and announce new posts to your Discord channel.'
    )
    .setColor(Colors.Purple)
    .addFields(
      {
        name: '📋 Free Tier',
        value: '• Track up to **3 links**\n• Check every **10 minutes**\n• YouTube & Twitter/X support',
        inline: true
      },
      {
        name: '💎 Premium Tier',
        value: '• Track up to **50 links**\n• Check every **1 minute**\n• All platforms supported',
        inline: true
      },
      {
        name: '🚀 Quick Start',
        value:
          '1. Use `/link add` to add a profile to monitor\n2. Set an announcement channel with `/settings channel`\n3. I\'ll announce new posts automatically!'
      },
      {
        name: '📚 Available Commands',
        value:
          '`/link add` · `/link list` · `/link remove`\n`/settings channel` · `/settings mode`\n`/premium info` · `/debug status`'
      }
    )
    .setFooter({ text: 'Need help? Run /help' });
}

/**
 * Create a status/debug embed
 */
export function createStatusEmbed(
  stats: {
    total_links: number;
    active_links: number;
    error_links: number;
    last_check?: Date;
    total_events: number;
    uptime?: string;
  }
): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('📊 Bot Status')
    .setColor(Colors.Green)
    .addFields(
      { name: 'Total Links', value: stats.total_links.toString(), inline: true },
      { name: 'Active', value: stats.active_links.toString(), inline: true },
      { name: 'Errors', value: stats.error_links.toString(), inline: true },
      { name: 'Total Events', value: stats.total_events.toString(), inline: true },
      { name: 'Last Check', value: stats.last_check?.toISOString() || 'Never', inline: true },
      { name: 'Uptime', value: stats.uptime || 'N/A', inline: true }
    )
    .setTimestamp();
}

/**
 * Create an error embed
 */
export function createErrorEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`❌ ${title}`)
    .setDescription(description)
    .setColor(Colors.Red);
}

/**
 * Create a success embed
 */
export function createSuccessEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`✅ ${title}`)
    .setDescription(description)
    .setColor(Colors.Green);
}
