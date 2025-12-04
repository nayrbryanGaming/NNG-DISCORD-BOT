import { SlashCommandBuilder, ChatInputCommandInteraction, ChannelType } from 'discord.js';
import { db } from '../index';
import { getOrCreateGuild } from '../utils/database';
import { createSuccessEmbed } from '../utils/embeds';

export default {
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Configure bot settings for this server')
    .addSubcommand((sub) =>
      sub
        .setName('channel')
        .setDescription('Set the default announcement channel')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Channel for announcements')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('mode')
        .setDescription('Set announcement mode')
        .addStringOption((opt) =>
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
    .addSubcommand((sub) =>
      sub
        .setName('interval')
        .setDescription('Set summary interval (for summary mode)')
        .addStringOption((opt) =>
          opt
            .setName('interval')
            .setDescription('How often to send summaries')
            .setRequired(true)
            .addChoices(
              { name: '15 minutes', value: '15' },
              { name: '1 hour', value: '60' },
              { name: '6 hours', value: '360' }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('show')
        .setDescription('Show current settings')
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({
        content: '❌ This command can only be used in a server.',
        ephemeral: true
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'channel':
        await handleSetChannel(interaction);
        break;
      case 'mode':
        await handleSetMode(interaction);
        break;
      case 'interval':
        await handleSetInterval(interaction);
        break;
      case 'show':
        await handleShow(interaction);
        break;
    }
  }
};

async function handleSetChannel(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) return;

  const channel = interaction.options.get('channel')?.channel;

  if (!channel) {
    await interaction.reply({
      content: '❌ Could not find the specified channel.',
      ephemeral: true
    });
    return;
  }

  await getOrCreateGuild(interaction.guildId, interaction.guild?.name || 'Unknown');

  await db.guild.update({
    where: { id: interaction.guildId },
    data: { announcement_channel: channel.id }
  });

  const embed = createSuccessEmbed(
    'Announcement Channel Updated',
    `All announcements will now be posted to <#${channel.id}>`
  );

  await interaction.reply({ embeds: [embed] });
}

async function handleSetMode(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) return;

  const mode = interaction.options.get('mode')?.value as string;

  await getOrCreateGuild(interaction.guildId, interaction.guild?.name || 'Unknown');

  await db.guild.update({
    where: { id: interaction.guildId },
    data: { announcement_mode: mode }
  });

  const modeLabel = mode === 'instant' ? 'Instant' : 'Summary';
  const embed = createSuccessEmbed(
    'Announcement Mode Updated',
    `Announcements will now be posted in **${modeLabel}** mode.${
      mode === 'summary'
        ? '\n\nUse `/settings interval` to configure how often summaries are sent.'
        : ''
    }`
  );

  await interaction.reply({ embeds: [embed] });
}

async function handleSetInterval(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) return;

  const interval = parseInt(interaction.options.get('interval')?.value as string);

  await getOrCreateGuild(interaction.guildId, interaction.guild?.name || 'Unknown');

  await db.guild.update({
    where: { id: interaction.guildId },
    data: { summary_interval: interval }
  });

  const intervalLabel =
    interval < 60 ? `${interval} minutes` : `${interval / 60} hour${interval > 60 ? 's' : ''}`;

  const embed = createSuccessEmbed(
    'Summary Interval Updated',
    `Summaries will now be posted every **${intervalLabel}**.`
  );

  await interaction.reply({ embeds: [embed] });
}

async function handleShow(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) return;

  await getOrCreateGuild(interaction.guildId, interaction.guild?.name || 'Unknown');

  const guild = await db.guild.findUnique({
    where: { id: interaction.guildId }
  });

  if (!guild) {
    await interaction.reply({
      content: '❌ Could not load guild settings.',
      ephemeral: true
    });
    return;
  }

  const intervalLabel =
    guild.summary_interval < 60
      ? `${guild.summary_interval} minutes`
      : `${guild.summary_interval / 60} hour${guild.summary_interval > 60 ? 's' : ''}`;

  const description = [
    `**Announcement Channel:** ${guild.announcement_channel ? `<#${guild.announcement_channel}>` : 'Not set'}`,
    `**Mode:** ${guild.announcement_mode === 'instant' ? 'Instant' : 'Summary'}`,
    `**Summary Interval:** ${intervalLabel}`,
    `**Timezone:** ${guild.timezone}`,
    `**Subscription Status:** ${guild.subscription_status === 'premium' ? '💎 Premium' : '🆓 Free'}`
  ].join('\n');

  const embed = createSuccessEmbed('Server Settings', description);

  await interaction.reply({ embeds: [embed] });
}
