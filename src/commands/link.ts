import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction
} from 'discord.js';
import { db } from '../index';
import {
  getOrCreateGuild,
  getOrCreateUser,
  canAddMoreLinks,
  validateAndParseUrl,
  getTierLimits
} from '../utils/database';
import { createLinkListEmbed, createErrorEmbed, createSuccessEmbed } from '../utils/embeds';
import { logger } from '../utils/logger';

export default {
  data: new SlashCommandBuilder()
    .setName('link')
    .setDescription('Manage tracked social media links')
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Add a social media profile to track')
        .addStringOption((opt) =>
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
        .addStringOption((opt) =>
          opt
            .setName('url')
            .setDescription('Full URL to the profile/channel')
            .setRequired(true)
        )
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Channel for announcements (default: this channel)')
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('list')
        .setDescription('List all tracked links for this server')
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove a tracked link')
        .addStringOption((opt) =>
          opt
            .setName('id')
            .setDescription('Link ID (from /link list)')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('pause')
        .setDescription('Pause a tracked link')
        .addStringOption((opt) =>
          opt
            .setName('id')
            .setDescription('Link ID (from /link list)')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('resume')
        .setDescription('Resume a paused link')
        .addStringOption((opt) =>
          opt
            .setName('id')
            .setDescription('Link ID (from /link list)')
            .setRequired(true)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    try {
      if (!interaction.guildId) {
        await interaction.reply({
          content: '❌ This command can only be used in a server.',
          ephemeral: true
        });
        return;
      }

      switch (subcommand) {
        case 'add':
          await handleAdd(interaction);
          break;
        case 'list':
          await handleList(interaction);
          break;
        case 'remove':
          await handleRemove(interaction);
          break;
        case 'pause':
          await handlePause(interaction);
          break;
        case 'resume':
          await handleResume(interaction);
          break;
      }
    } catch (err) {
      // Always reply to interaction if not already replied
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({
            content: '❌ An unexpected error occurred. Please try again later.'
          });
        } else {
          await interaction.reply({
            content: '❌ An unexpected error occurred. Please try again later.',
            ephemeral: true
          });
        }
      } catch (e) {
        // Ignore if reply fails
      }
      // Log error
      if (typeof logger !== 'undefined') {
        logger.error('Command execution error', { error: err, subcommand });
      } else {
        console.error('Command execution error', err);
      }
    }
  }
};

async function handleAdd(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const platform = interaction.options.get('platform')?.value as string;
  const url = interaction.options.get('url')?.value as string;
  const channel = interaction.options.get('channel')?.channel || interaction.channel;

  if (!interaction.guildId || !channel) {
    await interaction.editReply({
      content: '❌ Could not determine guild or channel.'
    });
    return;
  }

  // Check link limits
  const { can, used, limit } = await canAddMoreLinks(interaction.guildId);
  
  if (!can) {
    const embed = createErrorEmbed(
      'Link Limit Reached',
      `You've reached the maximum of **${limit} links** for your tier.\n\n**Current usage:** ${used}/${limit}\n\nUpgrade to Premium for up to 50 links! Use \`/premium info\``
    );
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // Check platform access
  const limits = await getTierLimits(interaction.guildId);
  if (!limits.supported_platforms.includes(platform as any)) {
    const embed = createErrorEmbed(
      'Premium Platform',
      `**${platform}** is a premium-only platform.\n\nUpgrade to access all platforms! Use \`/premium info\``
    );
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // Validate URL
  const parsed = await validateAndParseUrl(platform, url);
  
  if (!parsed) {
    const embed = createErrorEmbed(
      'Invalid URL',
      `The URL you provided doesn't match the expected format for **${platform}**.\n\nMake sure to use the full profile URL.`
    );
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // Create guild and user if needed
  await getOrCreateGuild(interaction.guildId, interaction.guild?.name || 'Unknown');
  await getOrCreateUser(interaction.user.id, interaction.user.username);

  // Save guild channel preference
  await db.guild.update({
    where: { id: interaction.guildId },
    data: { announcement_channel: channel.id }
  });

  // Check for duplicate
  const existing = await db.link.findFirst({
    where: {
      guild_id: interaction.guildId,
      platform,
      profile_handle: parsed.handle
    }
  });

  if (existing) {
    const embed = createErrorEmbed(
      'Link Already Exists',
      `You're already tracking **${parsed.handle}** on **${platform}**.`
    );
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // Create link
  const link = await db.link.create({
    data: {
      guild_id: interaction.guildId,
      owner_id: interaction.user.id,
      platform,
      profile_url: url,
      profile_handle: parsed.handle,
      profile_id: parsed.profile_id,
      content_types: 'all'
    }
  });

  logger.info('Link added', {
    guild_id: interaction.guildId,
    platform,
    handle: parsed.handle
  });

  const embed = createSuccessEmbed(
    'Link Added Successfully!',
    `Now tracking **${parsed.handle}** on **${platform}**\n\nAnnouncements will be posted in <#${channel.id}>\n\nLink ID: \`${link.id.substring(0, 8)}\``
  );

  await interaction.editReply({ embeds: [embed] });
}

async function handleList(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  if (!interaction.guildId) return;

  const links = await db.link.findMany({
    where: { guild_id: interaction.guildId },
    include: { events: { take: 1, orderBy: { created_at: 'desc' } } },
    orderBy: { created_at: 'desc' }
  });

  const embed = createLinkListEmbed(links);
  await interaction.editReply({ embeds: [embed] });
}

async function handleRemove(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const linkId = interaction.options.get('id')?.value as string;

  if (!interaction.guildId) return;

  // Find link
  const link = await db.link.findFirst({
    where: {
      id: { startsWith: linkId },
      guild_id: interaction.guildId
    }
  });

  if (!link) {
    const embed = createErrorEmbed(
      'Link Not Found',
      `No link found with ID starting with \`${linkId}\`.\n\nUse \`/link list\` to see all links.`
    );
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // Delete link
  await db.link.delete({ where: { id: link.id } });

  logger.info('Link removed', {
    guild_id: interaction.guildId,
    link_id: link.id,
    platform: link.platform,
    handle: link.profile_handle
  });

  const embed = createSuccessEmbed(
    'Link Removed',
    `Stopped tracking **${link.profile_handle}** on **${link.platform}**.`
  );

  await interaction.editReply({ embeds: [embed] });
}

async function handlePause(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const linkId = interaction.options.get('id')?.value as string;

  if (!interaction.guildId) return;

  const link = await db.link.findFirst({
    where: {
      id: { startsWith: linkId },
      guild_id: interaction.guildId
    }
  });

  if (!link) {
    const embed = createErrorEmbed('Link Not Found', `No link found with ID starting with \`${linkId}\`.`);
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  await db.link.update({
    where: { id: link.id },
    data: { status: 'paused' }
  });

  const embed = createSuccessEmbed(
    'Link Paused',
    `**${link.profile_handle}** on **${link.platform}** is now paused.\n\nUse \`/link resume ${linkId}\` to resume.`
  );

  await interaction.editReply({ embeds: [embed] });
}

async function handleResume(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const linkId = interaction.options.get('id')?.value as string;

  if (!interaction.guildId) return;

  const link = await db.link.findFirst({
    where: {
      id: { startsWith: linkId },
      guild_id: interaction.guildId
    }
  });

  if (!link) {
    const embed = createErrorEmbed('Link Not Found', `No link found with ID starting with \`${linkId}\`.`);
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  await db.link.update({
    where: { id: link.id },
    data: { status: 'active', error_count: 0, error_message: null }
  });

  const embed = createSuccessEmbed(
    'Link Resumed',
    `**${link.profile_handle}** on **${link.platform}** is now active again.`
  );

  await interaction.editReply({ embeds: [embed] });
}
