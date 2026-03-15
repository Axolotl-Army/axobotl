import { SlashCommandBuilder, MessageFlags, SectionBuilder, ThumbnailBuilder } from 'discord.js';
import type { SlashCommand } from '../types';
import { UserLevel } from '../../shared/models/UserLevel';
import { getLevelFromXp, getXpForLevel } from '../utils/levelUtils';
import { Op } from 'sequelize';
import { createContainer, createTitle, createText, createSeparator } from '../utils/componentBuilders';

export const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Check your level and XP, or another member\'s')
    .addUserOption((opt) =>
      opt.setName('user').setDescription('Member to check (defaults to you)').setRequired(false),
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('user') ?? interaction.user;
    const guildId = interaction.guildId!;

    const record = await UserLevel.findOne({ where: { guildId, userId: target.id } });

    const totalXp = record?.xp ?? 0;
    const level = getLevelFromXp(totalXp);
    const xpForCurrent = getXpForLevel(level);
    const xpForNext = getXpForLevel(level + 1);
    const xpIntoLevel = totalXp - xpForCurrent;
    const xpNeeded = xpForNext - xpForCurrent;

    const above = await UserLevel.count({
      where: { guildId, xp: { [Op.gt]: totalXp } },
    });
    const rank = above + 1;

    const avatarUrl = target.displayAvatarURL({ size: 128 });

    const container = createContainer();

    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          createTitle(target.displayName),
          createText(level === 0 ? 'Not ranked yet' : `Level ${level}`),
        )
        .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: avatarUrl } })),
    );

    container
      .addSeparatorComponents(createSeparator())
      .addTextDisplayComponents(
        createText(`**Total XP:** ${totalXp.toLocaleString()}`),
        createText(`**Guild Rank:** #${rank}`),
        createText(`**Progress to Level ${level + 1}:** ${xpIntoLevel.toLocaleString()} / ${xpNeeded.toLocaleString()} XP`),
      );

    await interaction.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    });
  },
};
