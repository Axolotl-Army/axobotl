import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import type { SlashCommand } from '../types';
import { createContainer, createTitle, createText, createSeparator } from '../utils/componentBuilders';
import { pluginCache, getAllPlugins } from '../plugins';

const BASE_COMMANDS: Array<{ name: string; description: string }> = [
  { name: '/ping', description: 'Check bot latency' },
  { name: '/help', description: 'Show this help message' },
];

const PLUGIN_COMMANDS: Record<string, Array<{ name: string; description: string }>> = {
  leveling: [
    { name: '/rank', description: 'Check your XP rank in the server' },
    { name: '/leaderboard', description: 'Show top XP earners' },
  ],
};

export const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('List all available commands'),

  async execute(interaction) {
    const container = createContainer()
      .addTextDisplayComponents(createTitle('Axobotl -- Commands'))
      .addSeparatorComponents(createSeparator());

    for (const cmd of BASE_COMMANDS) {
      container.addTextDisplayComponents(
        createText(`**${cmd.name}**\n${cmd.description}`),
      );
    }

    // Add commands from enabled plugins
    if (interaction.guildId) {
      const plugins = getAllPlugins();
      for (const plugin of plugins) {
        const enabled = await pluginCache.isEnabled(interaction.guildId, plugin.id);
        if (!enabled) continue;

        const pluginCmds = PLUGIN_COMMANDS[plugin.id];
        if (pluginCmds) {
          for (const cmd of pluginCmds) {
            container.addTextDisplayComponents(
              createText(`**${cmd.name}**\n${cmd.description}`),
            );
          }
        }
      }
    }

    await interaction.reply({
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      components: [container],
    });
  },
};
