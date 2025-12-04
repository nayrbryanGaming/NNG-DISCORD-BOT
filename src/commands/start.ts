import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import { createStartEmbed } from '../utils/embeds';

export default {
  data: new SlashCommandBuilder()
    .setName('start')
    .setDescription('Get started with Social Media Watcher Bot'),

  async execute(interaction: CommandInteraction) {
    const embed = createStartEmbed();
    await interaction.reply({ embeds: [embed] });
  }
};
