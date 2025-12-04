// Main Entry Point for Social Media Watcher Bot
import { Client, GatewayIntentBits, Collection, REST, Routes } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { startScheduler } from './services/scheduler';
import type { Command } from './commands';

// Load environment variables
dotenv.config();

// Initialize Prisma Client
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Export db alias for compatibility
export const db = prisma;

// Extend Client type to include commands
declare module 'discord.js' {
  export interface Client {
    commands: Collection<string, Command>;
  }
}

// Initialize Discord Client
export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

// Store commands
client.commands = new Collection();

// Import Commands
import startCommand from './commands/start';
import linkCommand from './commands/link';
import settingsCommand from './commands/settings';
import premiumCommand from './commands/premium';
import debugCommand from './commands/debug';

// Register commands
const commands = [
  startCommand,
  linkCommand,
  settingsCommand,
  premiumCommand,
  debugCommand,
];

commands.forEach(command => {
  client.commands.set(command.data.name, command);
});

// Bot Ready Event
client.once('ready', async () => {
  if (!client.user) return;
  
  logger.info(`✅ Logged in as ${client.user.tag}`);
  logger.info(`📊 Serving ${client.guilds.cache.size} guilds`);
  
  // Register slash commands globally
  await registerCommands();
  
  // Start the watcher scheduler
  startScheduler();
  
  logger.info('🚀 Bot is fully operational!');
});

// Handle Interactions (Slash Commands)
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  
  const command = client.commands.get(interaction.commandName);
  
  if (!command) {
    logger.warn(`Unknown command: ${interaction.commandName}`);
    return;
  }
  
  try {
    logger.info(`Command executed: /${interaction.commandName} by ${interaction.user.tag} in guild ${interaction.guildId}`);
    await command.execute(interaction);
  } catch (error) {
    logger.error(`Error executing command ${interaction.commandName}:`, error);
    
    const errorMessage = {
      content: '❌ An error occurred while executing this command. Please try again later.',
      ephemeral: true,
    };
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
});

// Handle Guild Join
client.on('guildCreate', async (guild) => {
  logger.info(`📥 Bot joined new guild: ${guild.name} (${guild.id})`);
  
  // Create guild entry in database
  await prisma.guild.upsert({
    where: { id: guild.id },
    create: { 
      id: guild.id,
      name: guild.name,
    },
    update: {},
  });
});

// Handle Guild Leave
client.on('guildDelete', async (guild) => {
  logger.info(`📤 Bot left guild: ${guild.name} (${guild.id})`);
  
  // Guild data will be cascade deleted by Prisma
});

// Register Slash Commands
async function registerCommands() {
  try {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);
    
    const commandData = commands.map(cmd => cmd.data.toJSON());
    
    logger.info('🔄 Registering slash commands...');
    
    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!),
      { body: commandData }
    );
    
    logger.info(`✅ Successfully registered ${commandData.length} slash commands`);
  } catch (error) {
    logger.error('Failed to register slash commands:', error);
  }
}

// Graceful Shutdown
process.on('SIGINT', async () => {
  logger.info('🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  client.destroy();
  process.exit(0);
});

// Error Handlers
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);
