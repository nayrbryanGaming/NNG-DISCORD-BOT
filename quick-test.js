// Quick test to verify bot can start
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

console.log('🔍 Starting bot test...');
console.log('Token exists:', !!process.env.DISCORD_TOKEN);
console.log('Token length:', process.env.DISCORD_TOKEN?.length);
console.log('Client ID:', process.env.DISCORD_CLIENT_ID);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

client.once('ready', () => {
  console.log('✅ Bot logged in as:', client.user.tag);
  console.log('📊 Guilds:', client.guilds.cache.size);
  console.log('Guild IDs:', [...client.guilds.cache.keys()]);
  
  setTimeout(() => {
    console.log('Test complete, shutting down...');
    client.destroy();
    process.exit(0);
  }, 3000);
});

client.on('error', (error) => {
  console.error('❌ Client error:', error);
});

client.login(process.env.DISCORD_TOKEN).catch(error => {
  console.error('❌ Login failed:', error.message);
  process.exit(1);
});
