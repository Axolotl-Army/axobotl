import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import type { SlashCommand } from '../types';
import { GuildPlugin } from '../../shared/models/GuildPlugin';
import { formatLevelUpMessage } from '../utils/levelUtils';
import { createContainer, createTitle, createText, createSeparator } from '../utils/componentBuilders';

const RESET_KEYWORD = 'reset';

export const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('levelconfig')
    .setDescription('Configure leveling settings for this server (requires Manage Server)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('setmessage')
        .setDescription('Level-up template. Use {user}, {level} as placeholders, or "reset" to restore default.')
        .addStringOption((opt) =>
          opt
            .setName('message')
            .setDescription('Template string (max 500 chars), or "reset"')
            .setMaxLength(500)
            .setRequired(true),
        ),
    ),

  async execute(interaction) {
    const guildId = interaction.guildId!;
    const message = interaction.options.getString('message', true).trim();

    const isReset = message.toLowerCase() === RESET_KEYWORD;
    const newTemplate = isReset ? null : message;

    // Update plugin config
    const [pluginRow] = await GuildPlugin.findOrCreate({
      where: { guildId, pluginId: 'leveling' },
      defaults: { guildId, pluginId: 'leveling', enabled: true, config: {} },
    });

    const currentConfig = (pluginRow.config as Record<string, unknown>) ?? {};
    await pluginRow.update({
      config: { ...currentConfig, levelUpMessage: newTemplate },
    });

    const preview = formatLevelUpMessage(newTemplate, `<@${interaction.user.id}>`, 5);

    const title = isReset ? 'Level-Up Message Reset' : 'Level-Up Message Updated';

    const container = createContainer(0x57f287)
      .addTextDisplayComponents(createTitle(title))
      .addSeparatorComponents(createSeparator())
      .addTextDisplayComponents(
        createText(`**Preview:** ${preview}`),
      );

    await interaction.reply({
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      components: [container],
    });
  },
};
