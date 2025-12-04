import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Colors } from 'discord.js';
import { db } from '../index';
import { isPremium } from '../utils/database';

export default {
  data: new SlashCommandBuilder()
    .setName('premium')
    .setDescription('Manage premium subscription')
    .addSubcommand((sub) =>
      sub.setName('info').setDescription('Show premium information and subscription status')
    )
    .addSubcommand((sub) =>
      sub
        .setName('subscribe')
        .setDescription('Subscribe to premium (crypto payment)')
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    if (!interaction.guildId) {
      await interaction.reply({
        content: '❌ This command can only be used in a server.',
        ephemeral: true
      });
      return;
    }

    switch (subcommand) {
      case 'info':
        await handleInfo(interaction);
        break;
      case 'subscribe':
        await handleSubscribe(interaction);
        break;
    }
  }
};

async function handleInfo(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) return;

  const premium = await isPremium(interaction.guildId);
  const guild = await db.guild.findUnique({
    where: { id: interaction.guildId },
    select: { premium_expires: true }
  });

  const embed = new EmbedBuilder()
    .setTitle('💎 Premium Information')
    .setColor(premium ? Colors.Gold : Colors.Blurple)
    .addFields(
      {
        name: '📋 Free Tier',
        value: '• Max **3 links**\n• Check every **10 minutes**\n• YouTube & Twitter/X\n• Basic announcements',
        inline: true
      },
      {
        name: '💎 Premium Tier',
        value:
          '• Max **50 links**\n• Check every **1 minute**\n• **All platforms**\n• AI summaries\n• Custom branding',
        inline: true
      },
      {
        name: '💰 Pricing',
        value: '**$5.00 USD/month**\nPaid in USDC/USDT on Polygon',
        inline: false
      }
    );

  if (premium && guild?.premium_expires) {
    embed.setDescription(
      `✅ **This server has Premium!**\n\nExpires: ${guild.premium_expires.toDateString()}`
    );
  } else {
    embed.setDescription(
      '🆓 **This server is on the Free tier.**\n\nUpgrade to Premium for more features!\nUse `/premium subscribe` to get started.'
    );
  }

  await interaction.reply({ embeds: [embed] });
}

async function handleSubscribe(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) return;

  // This is a placeholder for Phase 3
  const embed = new EmbedBuilder()
    .setTitle('💎 Premium Subscription')
    .setDescription(
      '**Premium subscriptions will be available soon!**\n\n' +
        'We\'re currently implementing crypto payment processing.\n\n' +
        '**Planned features:**\n' +
        '• Pay with USDC/USDT on Polygon (low gas fees)\n' +
        '• Fully automated payment detection\n' +
        '• Instant activation\n\n' +
        'Stay tuned!'
    )
    .setColor(Colors.Yellow);

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
