// Register slash commands to Discord
require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

console.log('🔄 Building command definitions...');

// Manually define commands (simplified for registration)
const commands = [
  new SlashCommandBuilder()
    .setName('start')
    .setDescription('Get started with the bot and see basic information')
    .toJSON(),
    
  new SlashCommandBuilder()
    .setName('link')
    .setDescription('Manage tracked social media links')
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Add a social media profile to track')
        .addStringOption(opt =>
          opt
            .setName('platform')
            .setDescription('Social media platform')
            .setRequired(true)
            .addChoices(
              { name: 'YouTube', value: 'youtube' },
              { name: 'Twitter/X', value: 'twitter' },
              { name: 'Instagram (Premium)', value: 'instagram' },
              { name: 'Reddit (Premium)', value: 'reddit' },
              { name: 'Telegram (Premium)', value: 'telegram' },
              { name: 'TikTok (Premium)', value: 'tiktok' }
            )
        )
        .addStringOption(opt =>
          opt.setName('url').setDescription('Full URL to the profile/channel').setRequired(true)
        )
        .addChannelOption(opt =>
          opt.setName('channel').setDescription('Channel for announcements (optional)')
        )
    )
    .addSubcommand(sub =>
      sub.setName('list').setDescription('List all tracked links in this server')
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Remove a tracked link')
        .addStringOption(opt =>
          opt.setName('id').setDescription('Link ID (from /link list)').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('pause')
        .setDescription('Pause a link temporarily')
        .addStringOption(opt =>
          opt.setName('id').setDescription('Link ID (from /link list)').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('resume')
        .setDescription('Resume a paused link')
        .addStringOption(opt =>
          opt.setName('id').setDescription('Link ID (from /link list)').setRequired(true)
        )
    )
    .toJSON(),
    
  new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Configure bot settings for this server')
    .addSubcommand(sub =>
      sub
        .setName('channel')
        .setDescription('Set default announcement channel')
        .addChannelOption(opt =>
          opt.setName('channel').setDescription('The channel to announce in').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('mode')
        .setDescription('Set announcement mode')
        .addStringOption(opt =>
          opt
            .setName('mode')
            .setDescription('Announcement mode')
            .setRequired(true)
            .addChoices(
              { name: 'Instant (announce immediately)', value: 'instant' },
              { name: 'Summary (batch announcements)', value: 'summary' }
            )
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('interval')
        .setDescription('Set check interval (Premium only for <10 min)')
        .addIntegerOption(opt =>
          opt
            .setName('interval')
            .setDescription('Minutes between checks')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(1440)
        )
    )
    .addSubcommand(sub =>
      sub.setName('show').setDescription('Show current server settings')
    )
    .toJSON(),
    
  new SlashCommandBuilder()
    .setName('premium')
    .setDescription('Manage premium subscription')
    .addSubcommand(sub =>
      sub.setName('info').setDescription('Show premium information and subscription status')
    )
    .addSubcommand(sub =>
      sub.setName('subscribe').setDescription('Subscribe to premium (crypto payment)')
    )
    .toJSON(),
    
  new SlashCommandBuilder()
    .setName('debug')
    .setDescription('Debug and diagnostic commands (Admin only)')
    .addSubcommand(sub =>
      sub.setName('status').setDescription('Show bot status and health')
    )
    .addSubcommand(sub =>
      sub
        .setName('logs')
        .setDescription('View recent error logs')
        .addIntegerOption(opt =>
          opt.setName('limit').setDescription('Number of logs to show').setMinValue(1).setMaxValue(50)
        )
    )
    .toJSON()
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

console.log('🔄 Registering slash commands to Discord...');
console.log(`Commands: ${commands.map(c => c.name).join(', ')}`);

(async () => {
  try {
    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands }
    );
    
    console.log('✅ Successfully registered 5 slash commands!');
    console.log('\n📝 Available commands:');
    commands.forEach(cmd => console.log(`  - /${cmd.name}: ${cmd.description}`));
    console.log('\n⚠️  Note: Global commands may take up to 1 hour to sync to all servers');
    console.log('🚀 Try testing with /start in your Discord server now!');
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
})();
