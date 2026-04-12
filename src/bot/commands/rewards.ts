import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import type { SlashCommand } from '../types';
import { LevelRole } from '../../shared/models/LevelRole';
import { createGuildContainer, createTitle, createText, createSeparator } from '../utils/componentBuilders';

export const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('rewards')
    .setDescription('View all available level-up role rewards'),

  async execute(interaction) {
    const guildId = interaction.guildId!;

    const levelRoles = await LevelRole.findAll({
      where: { guildId },
      order: [['level', 'ASC']],
    });

    const container = await createGuildContainer(guildId);
    container.addTextDisplayComponents(createTitle('Role Rewards'));
    container.addSeparatorComponents(createSeparator());

    if (levelRoles.length === 0) {
      container.addTextDisplayComponents(
        createText('No role rewards have been configured for this server.'),
      );
    } else {
      const lines = levelRoles.map((lr) => {
        const desc = lr.description?.trim() ? ` -- ${lr.description.trim()}` : '';
        const tag = lr.cumulative ? ' *(cumulative)*' : '';
        const rolePart = lr.roleId ? `<@&${lr.roleId}>${tag}` : 'Milestone';
        return `**Level ${lr.level}** -- ${rolePart}${desc}`;
      });

      container.addTextDisplayComponents(createText(lines.join('\n')));
    }

    await interaction.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    });
  },
};
