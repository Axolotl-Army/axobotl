import { SlashCommandBuilder } from 'discord.js';
import type { SlashCommand } from '../types';

export const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency'),

  async execute(interaction) {
    const { resource } = await interaction.reply({ content: 'Pinging...', withResponse: true });
    const latency = resource!.message!.createdTimestamp - interaction.createdTimestamp;
    await interaction.editReply(
      `Pong! 🏓 Latency: **${latency}ms** | API: **${interaction.client.ws.ping}ms**`,
    );
  },
};
