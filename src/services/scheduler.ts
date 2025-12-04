// Unified Scheduler Service
// Coordinates all background workers (watcher, payment monitoring, subscription expiry)

import { logger } from '../utils/logger';
// import { startWatcher } from '../workers/watcher';
// import { startPaymentWatcher } from '../workers/payment-watcher';
// import { startSubscriptionExpiry } from '../workers/subscription-expiry';

let isRunning = false;

/**
 * Start all background services
 */
export function startScheduler(): void {
  if (isRunning) {
    logger.warn('Scheduler already running, skipping start');
    return;
  }

  logger.info('🕐 Starting scheduler services...');
  logger.info('⚠️ Workers disabled - using GitHub Actions for monitoring');

  // TODO: Re-enable when workers are fixed
  /*
  try {
    // Start the main content watcher (runs every minute)
    startWatcher();
    logger.info('✅ Content watcher started');

    // Start crypto payment monitoring (runs every 2 minutes)
    if (process.env.ENABLE_CRYPTO_PAYMENTS === 'true') {
      startPaymentWatcher();
      logger.info('✅ Payment watcher started');
    }

    // Start subscription expiry checker (runs every hour)
    startSubscriptionExpiry();
    logger.info('✅ Subscription expiry checker started');

    isRunning = true;
    logger.info('✅ All scheduler services started successfully');
  } catch (error) {
    logger.error('❌ Error starting scheduler:', error);
    throw error;
  }
  */

  isRunning = true;
}

/**
 * Stop all background services (for graceful shutdown)
 */
export function stopScheduler(): void {
  if (!isRunning) {
    logger.warn('Scheduler not running, nothing to stop');
    return;
  }

  logger.info('🛑 Stopping scheduler services...');
  
  // Note: node-cron tasks stop automatically when process exits
  // This function is here for future expansion (e.g., manual task.stop())
  
  isRunning = false;
  logger.info('✅ Scheduler services stopped');
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus() {
  return {
    running: isRunning,
    services: {
      contentWatcher: true,
      paymentWatcher: process.env.ENABLE_CRYPTO_PAYMENTS === 'true',
      subscriptionExpiry: true,
    },
  };
}
