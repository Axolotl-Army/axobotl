import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import type { SlashCommand } from '../types';
import { createContainer, createTitle, createText, createSeparator } from '../utils/componentBuilders';

const COMMANDS: Array<{ name: string; description: string }> = [
  { name: '/ping', description: 'Check bot latency' },
  { name: '/help', description: 'Show this help message' },
  { name: '/rank', description: 'Check your XP rank in the server' },
  { name: '/leaderboard', description: 'Show top XP earners' },
  { name: '/xp', description: 'Admin: manage user XP' },
  { name: '/levelconfig', description: 'Admin: configure level-up settings' },
];

export const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('List all available commands'),

  async execute(interaction) {
    const container = createContainer()
      .addTextDisplayComponents(createTitle('Axobotl -- Commands'))
      .addSeparatorComponents(createSeparator());

    for (const cmd of COMMANDS) {
      container.addTextDisplayComponents(
        createText(`**${cmd.name}**\n${cmd.description}`),
      );
    }

    await interaction.reply({
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      components: [container],
    });
  },
};
