import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { db } from '../index';
import { createStatusEmbed, createErrorEmbed } from '../utils/embeds';
import { logger } from '../utils/logger';

export default {
  data: new SlashCommandBuilder()
    .setName('debug')
    .setDescription('Debug and status commands')
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('Show bot status and statistics')
    )
    .addSubcommand((sub) =>
      sub.setName('errors').setDescription('Show recent errors').addIntegerOption((opt) =>
        opt
          .setName('limit')
          .setDescription('Number of errors to show (default: 10)')
          .setMinValue(1)
          .setMaxValue(50)
      )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'status':
        await handleStatus(interaction);
        break;
      case 'errors':
        await handleErrors(interaction);
        break;
    }
  }
};

async function handleStatus(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    // Gather statistics
    const [totalLinks, activeLinks, errorLinks, totalEvents, recentCheck] = await Promise.all([
      db.link.count(),
      db.link.count({ where: { status: 'active' } }),
      db.link.count({ where: { status: 'error' } }),
      db.linkEvent.count(),
      db.link.findFirst({
        where: { last_check: { not: null } },
        orderBy: { last_check: 'desc' },
        select: { last_check: true }
      })
    ]);

    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const uptimeStr = `${hours}h ${minutes}m`;

    const stats = {
      total_links: totalLinks,
      active_links: activeLinks,
      error_links: errorLinks,
      total_events: totalEvents,
      last_check: recentCheck?.last_check || undefined,
      uptime: uptimeStr
    };

    const embed = createStatusEmbed(stats);

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error('Error fetching debug status', { error });
    const embed = createErrorEmbed('Error', 'Failed to fetch status information.');
    await interaction.editReply({ embeds: [embed] });
  }
}

async function handleErrors(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const limit = (interaction.options.get('limit')?.value as number) || 10;

  try {
    const errors = await db.systemLog.findMany({
      where: { level: 'error' },
      orderBy: { created_at: 'desc' },
      take: limit
    });

    if (errors.length === 0) {
      await interaction.editReply({ content: '✅ No recent errors found!' });
      return;
    }

    const errorList = errors
      .map((err, idx) => {
        const timestamp = err.created_at.toISOString().replace('T', ' ').substring(0, 19);
        return `**${idx + 1}.** \`[${timestamp}]\` **${err.category}**\n   ${err.message}`;
      })
      .join('\n\n');

    const content = `**🔍 Recent Errors (last ${limit})**\n\n${errorList}`;

    // Split if too long
    if (content.length > 2000) {
      const chunks = content.match(/[\s\S]{1,2000}/g) || [];
      await interaction.editReply({ content: chunks[0] });
      for (let i = 1; i < chunks.length; i++) {
        await interaction.followUp({ content: chunks[i], ephemeral: true });
      }
    } else {
      await interaction.editReply({ content });
    }
  } catch (error) {
    logger.error('Error fetching error logs', { error });
    await interaction.editReply({ content: '❌ Failed to fetch error logs.' });
  }
}
