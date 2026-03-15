import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import type { SlashCommand } from '../types';
import { createContainer, createTitle, createText } from '../utils/componentBuilders';

export const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency'),

  async execute(interaction) {
    const sent = Date.now();
    await interaction.deferReply();
    const latency = Date.now() - sent;
    const apiLatency = interaction.client.ws.ping;

    const container = createContainer()
      .addTextDisplayComponents(createTitle('Pong!'))
      .addTextDisplayComponents(
        createText(`**Bot latency:** ${latency}ms`),
        createText(`**API latency:** ${apiLatency}ms`),
      );

    await interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    });
  },
};
