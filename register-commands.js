// Register slash commands to Discord
require('dotenv').config();
const { REST, Routes } = require('discord.js');

// Import compiled commands
const startCommand = require('./dist/commands/start').default;
const linkCommand = require('./dist/commands/link').default;
const settingsCommand = require('./dist/commands/settings').default;
const premiumCommand = require('./dist/commands/premium').default;
const debugCommand = require('./dist/commands/debug').default;

const commands = [
  startCommand,
  linkCommand,
  settingsCommand,
  premiumCommand,
  debugCommand,
];

const commandData = commands.map(cmd => cmd.data.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

console.log('🔄 Registering slash commands...');
console.log(`Commands to register: ${commandData.map(c => c.name).join(', ')}`);

(async () => {
  try {
    // Register globally
    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commandData }
    );
    
    console.log('✅ Successfully registered commands globally!');
    console.log('Note: Global commands may take up to 1 hour to appear in all servers.');
    console.log('\n🚀 You can now test the bot with /start command');
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
})();
