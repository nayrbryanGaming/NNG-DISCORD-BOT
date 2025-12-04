import cron from 'node-cron';
import { db, client } from '../index';
import { fetchPlatformContent } from '../fetchers';
import { logger } from '../utils/logger';
import { createAnnouncementEmbed } from '../utils/embeds';
import { isPremium } from '../utils/database';
import { TextChannel } from 'discord.js';

/**
 * Main watcher loop that checks all active links for new content
 * Runs every minute, but respects per-link check intervals
 */
export function startWatcher() {
  cron.schedule('* * * * *', async () => {
    try {
      await runWatcherCycle();
    } catch (error) {
      logger.error('Watcher cycle error', { error });
    }
  });
  
  logger.info('[Watcher] Initialized - running every minute');
}

async function runWatcherCycle() {
  logger.info('[Watcher] Starting cycle...');

  // Get all active links that need checking
  const links = await db.link.findMany({
    where: {
      status: 'active'
    },
    include: {
      guild: true
    }
  });

  logger.info(`[Watcher] Found ${links.length} total links`);

  let checkedCount = 0;
  let errorCount = 0;
  let newContentCount = 0;

  for (const link of links) {
    try {
      // Check if guild is premium
      const premium = await isPremium(link.guild_id);
      const minInterval = premium ? 1 : 10; // 1 minute for premium, 10 for free

      // Skip if checked too recently
      if (link.last_check) {
        const minutesSinceCheck = (Date.now() - link.last_check.getTime()) / 1000 / 60;
        if (minutesSinceCheck < minInterval) {
          continue;
        }
      }

      checkedCount++;

      // Fetch content
      const contents = await fetchPlatformContent(
        link.platform as any,
        link.profile_url,
        link.profile_handle,
        link.profile_id || undefined
      );

      // Update last check time
      await db.link.update({
        where: { id: link.id },
        data: {
          last_check: new Date(),
          status: 'active',
          error_message: null,
          error_count: 0
        }
      });

      // Process new content
      for (const content of contents) {
        // Check if already seen
        const existing = await db.linkEvent.findUnique({
          where: {
            link_id_content_id: {
              link_id: link.id,
              content_id: content.id
            }
          }
        });

        if (existing) {
          continue; // Already announced
        }

        // Check if newer than last seen
        if (link.last_seen_timestamp && content.published_at <= link.last_seen_timestamp) {
          continue;
        }

        // Save event
        await db.linkEvent.create({
          data: {
            link_id: link.id,
            content_id: content.id,
            content_type: content.type,
            title: content.title,
            description: content.description,
            media_url: content.media_url,
            url: content.url,
            published_at: content.published_at
          }
        });

        newContentCount++;

        // Send announcement (if instant mode)
        if (link.guild.announcement_mode === 'instant' && link.guild.announcement_channel) {
          try {
            await sendAnnouncement(link, content);
          } catch (error) {
            logger.error('Failed to send announcement', {
              link_id: link.id,
              content_id: content.id,
              error
            });
          }
        }

        // Update last seen
        await db.link.update({
          where: { id: link.id },
          data: {
            last_seen_id: content.id,
            last_seen_timestamp: content.published_at
          }
        });

        logger.info('New content detected', {
          platform: link.platform,
          handle: link.profile_handle,
          content_id: content.id,
          type: content.type
        });
      }

      // Rate limiting: wait 200ms between links
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error: any) {
      errorCount++;

      logger.error('Error checking link', {
        link_id: link.id,
        platform: link.platform,
        handle: link.profile_handle,
        error: error.message
      });

      // Increment error count
      const newErrorCount = link.error_count + 1;

      // Mark as error if too many failures
      await db.link.update({
        where: { id: link.id },
        data: {
          last_check: new Date(),
          error_count: newErrorCount,
          status: newErrorCount >= 5 ? 'error' : 'active',
          error_message: error.message
        }
      });
    }
  }

  logger.info(
    `[Watcher] Cycle complete: checked=${checkedCount}, new_content=${newContentCount}, errors=${errorCount}`
  );
}

/**
 * Send announcement to Discord channel
 */
async function sendAnnouncement(
  link: any,
  content: any
): Promise<void> {
  const channelId = link.guild.announcement_channel;

  if (!channelId) {
    return;
  }

  try {
    const channel = await client.channels.fetch(channelId);

    if (!channel || !channel.isTextBased()) {
      logger.warn('Announcement channel not found or not text-based', {
        guild_id: link.guild_id,
        channel_id: channelId
      });
      return;
    }

    const embed = createAnnouncementEmbed(link, content);

    await (channel as TextChannel).send({ embeds: [embed] });

    // Mark as announced
    await db.linkEvent.updateMany({
      where: {
        link_id: link.id,
        content_id: content.id
      },
      data: {
        announced_at: new Date()
      }
    });

    logger.info('Announcement sent', {
      guild_id: link.guild_id,
      platform: link.platform,
      content_id: content.id
    });
  } catch (error) {
    logger.error('Failed to send announcement', {
      guild_id: link.guild_id,
      channel_id: channelId,
      error
    });
    throw error;
  }
}
