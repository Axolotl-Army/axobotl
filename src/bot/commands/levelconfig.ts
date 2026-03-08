import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import type { SlashCommand } from '../types';
import { Guild } from '../../shared/models/Guild';
import { formatLevelUpMessage, DEFAULT_LEVEL_UP_MESSAGE } from '../utils/levelUtils';

const RESET_KEYWORD = 'reset';

export const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('levelconfig')
    .setDescription('Configure leveling settings for this server (requires Manage Server)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('setmessage')
        .setDescription(
          'Set the level-up message template. Use {user} and {level} as placeholders. Type "reset" to restore default.',
        )
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

    await Guild.update({ levelUpMessage: newTemplate }, { where: { id: guildId } });

    const preview = formatLevelUpMessage(newTemplate, `<@${interaction.user.id}>`, 5);

    const content = isReset
      ? `Level-up message reset to default.\n\n**Preview:** ${preview}`
      : `Level-up message updated.\n\n**Preview:** ${preview}`;

    await interaction.reply({ content, flags: MessageFlags.Ephemeral });
  },
};
