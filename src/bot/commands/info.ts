import { SlashCommandBuilder, MessageFlags, version as djsVersion } from 'discord.js';
import type { SlashCommand } from '../types';
import { createContainer, createTitle, createText, createSeparator } from '../utils/componentBuilders';

export const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Show general information about the bot'),

  async execute(interaction) {
    const { client } = interaction;
    const uptime = formatUptime(client.uptime ?? 0);
    const guildCount = client.guilds.cache.size;
    const memberCount = client.guilds.cache.reduce((sum, g) => sum + g.memberCount, 0);
    const dashboardUrl = process.env['DASHBOARD_URL'] ?? null;

    const container = createContainer()
      .addTextDisplayComponents(createTitle('Axobotl'))
      .addSeparatorComponents(createSeparator())
      .addTextDisplayComponents(
        createText(`**Servers:** ${guildCount}`),
        createText(`**Members:** ${memberCount}`),
        createText(`**Uptime:** ${uptime}`),
        createText(`**discord.js:** v${djsVersion}`),
      );

    if (dashboardUrl) {
      container
        .addSeparatorComponents(createSeparator())
        .addTextDisplayComponents(
          createText(`**Dashboard:** ${dashboardUrl}`),
        );
    }

    await interaction.reply({
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      components: [container],
    });
  },
};

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(' ');
}
