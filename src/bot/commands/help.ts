import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import type { SlashCommand } from '../types';

export const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('List all available commands'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('Axobotl — Available Commands')
      .setColor(0x5865f2)
      .addFields(
        { name: '/ping', value: 'Check bot latency', inline: true },
        { name: '/help', value: 'Show this help message', inline: true },
      )
      .setFooter({ text: 'More commands coming soon!' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
