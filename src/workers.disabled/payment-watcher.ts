// Crypto Payment Watcher
// Monitors blockchain for incoming USDC/USDT payments on Polygon network

import cron from 'node-cron';
import { ethers } from 'ethers';
import { prisma } from '../index';
import { logger } from '../utils/logger';

// ERC-20 ABI (minimal - only Transfer event)
const ERC20_ABI = [
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'function decimals() view returns (uint8)',
];

// Polygon token addresses
const POLYGON_TOKENS = {
  USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // USDC on Polygon PoS
  USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // USDT on Polygon PoS
};

let isWatching = false;
let provider: ethers.JsonRpcProvider | null = null;
let lastCheckedBlock: { [token: string]: number } = {};

/**
 * Initialize blockchain provider
 */
function initProvider(): ethers.JsonRpcProvider {
  const rpcUrl = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';
  
  logger.info(`Initializing Polygon provider: ${rpcUrl}`);
  
  return new ethers.JsonRpcProvider(rpcUrl);
}

/**
 * Start the payment watcher cron job
 */
export function startPaymentWatcher(): void {
  if (isWatching) {
    logger.warn('Payment watcher already running');
    return;
  }

  // Verify wallet address is configured
  if (!process.env.PAYMENT_WALLET_ADDRESS) {
    logger.error('PAYMENT_WALLET_ADDRESS not set in .env - payment watcher disabled');
    return;
  }

  provider = initProvider();
  isWatching = true;

  // Run every 2 minutes
  cron.schedule('*/2 * * * *', async () => {
    await checkPayments();
  });

  logger.info('💰 Payment watcher started (checking every 2 minutes)');
  
  // Run initial check
  checkPayments().catch(error => {
    logger.error('Initial payment check failed:', error);
  });
}

/**
 * Check for new payments to our wallet
 */
async function checkPayments(): Promise<void> {
  if (!provider || !process.env.PAYMENT_WALLET_ADDRESS) {
    return;
  }

  try {
    const currentBlock = await provider.getBlockNumber();
    logger.debug(`Current Polygon block: ${currentBlock}`);

    // Check both USDC and USDT
    for (const [symbol, address] of Object.entries(POLYGON_TOKENS)) {
      await checkTokenPayments(symbol, address, currentBlock);
    }
  } catch (error) {
    logger.error('Error checking payments:', error);
  }
}

/**
 * Check payments for a specific token
 */
async function checkTokenPayments(
  symbol: string,
  tokenAddress: string,
  currentBlock: number
): Promise<void> {
  if (!provider || !process.env.PAYMENT_WALLET_ADDRESS) return;

  try {
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    
    // Get token decimals
    const decimals = await contract.decimals();
    
    // Determine block range to check
    const fromBlock = lastCheckedBlock[symbol] 
      ? lastCheckedBlock[symbol] + 1 
      : currentBlock - 100; // Check last 100 blocks on first run (~3-5 minutes)
    
    if (fromBlock > currentBlock) {
      return; // No new blocks
    }

    logger.debug(`Checking ${symbol} payments from block ${fromBlock} to ${currentBlock}`);

    // Query Transfer events to our wallet
    const filter = contract.filters.Transfer(null, process.env.PAYMENT_WALLET_ADDRESS);
    const events = await contract.queryFilter(filter, fromBlock, currentBlock);

    logger.debug(`Found ${events.length} ${symbol} transfer(s) to our wallet`);

    // Process each transfer
    for (const event of events) {
      await processPaymentEvent(event as ethers.EventLog, symbol, decimals);
    }

    // Update last checked block
    lastCheckedBlock[symbol] = currentBlock;
  } catch (error) {
    logger.error(`Error checking ${symbol} payments:`, error);
  }
}

/**
 * Process a single payment event
 */
async function processPaymentEvent(
  event: ethers.EventLog,
  currency: string,
  decimals: bigint
): Promise<void> {
  try {
    if (!event.args) return;

    const fromAddress = event.args[0] as string;
    const amount = event.args[2] as bigint;
    const txHash = event.transactionHash;

    // Convert amount from smallest unit to token units
    const amountInTokens = parseFloat(ethers.formatUnits(amount, decimals));

    logger.info(`💸 Received ${amountInTokens} ${currency} from ${fromAddress} (tx: ${txHash})`);

    // Check if we already processed this transaction
    const existingPayment = await prisma.payment.findUnique({
      where: { tx_hash: txHash },
    });

    if (existingPayment) {
      logger.debug(`Payment ${txHash} already processed, skipping`);
      return;
    }

    // Find pending payments that match this amount (within 0.01 tolerance)
    const pendingPayments = await prisma.payment.findMany({
      where: {
        status: 'pending',
        currency,
        blockchain: 'polygon',
        unique_amount: {
          gte: amountInTokens - 0.01,
          lte: amountInTokens + 0.01,
        },
      },
      include: {
        subscription: {
          include: {
            guild: true,
          },
        },
        user: true,
      },
    });

    if (pendingPayments.length === 0) {
      logger.warn(`No pending payment found matching ${amountInTokens} ${currency}`);
      return;
    }

    // Match the oldest pending payment
    const payment = pendingPayments[0];
    
    logger.info(`✅ Matched payment to subscription ${payment.subscription_id}`);

    // Update payment as confirmed
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'confirmed',
        tx_hash: txHash,
        wallet_address: fromAddress.toLowerCase(),
        confirmed_at: new Date(),
      },
    });

    // Activate premium subscription
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

    await prisma.guild.update({
      where: { id: payment.subscription.guild_id },
      data: {
        subscription_status: 'premium',
        premium_expires: expiresAt,
      },
    });

    await prisma.subscription.update({
      where: { id: payment.subscription_id },
      data: {
        status: 'active',
        tier: 'premium',
        starts_at: new Date(),
        expires_at: expiresAt,
      },
    });

    logger.info(`🎉 Premium activated for guild ${payment.subscription.guild_id} until ${expiresAt.toISOString()}`);

    // TODO: Send Discord DM to user confirming premium activation
    // This requires access to the Discord client

  } catch (error) {
    logger.error('Error processing payment event:', error);
  }
}

/**
 * Get payment watcher status
 */
export function getPaymentWatcherStatus() {
  return {
    isWatching,
    lastCheckedBlocks: lastCheckedBlock,
    walletAddress: process.env.PAYMENT_WALLET_ADDRESS,
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
  };
}
