import cron from 'node-cron';
import { db } from '../index';
import { logger } from '../utils/logger';

/**
 * Check for expired premium subscriptions daily
 * Downgrades guilds back to free tier and notifies admins
 */
export function startSubscriptionExpiry() {
  cron.schedule('0 0 * * *', async () => {
    // Runs daily at midnight
    try {
      await checkExpiredSubscriptions();
    } catch (error) {
      logger.error('Subscription expiry check error', { error });
    }
  });
  
  logger.info('[Subscription Expiry] Initialized - runs daily at midnight');
}

async function checkExpiredSubscriptions() {
  logger.info('[Subscription Expiry] Checking for expired subscriptions...');

  const expiredGuilds = await db.guild.findMany({
    where: {
      subscription_status: 'premium',
      premium_expires: {
        lte: new Date()
      }
    }
  });

  logger.info(`[Subscription Expiry] Found ${expiredGuilds.length} expired subscriptions`);

  for (const guild of expiredGuilds) {
    try {
      // Downgrade to free tier
      await db.guild.update({
        where: { id: guild.id },
        data: {
          subscription_status: 'free',
          premium_expires: null
        }
      });

      logger.info('Subscription expired', {
        guild_id: guild.id,
        guild_name: guild.name
      });

      // TODO: Send notification to guild owner/admin
      // This would require storing guild owner ID or using Discord API to find admins
    } catch (error) {
      logger.error('Failed to process expired subscription', {
        guild_id: guild.id,
        error
      });
    }
  }

  logger.info('[Subscription Expiry] Check complete');
}
