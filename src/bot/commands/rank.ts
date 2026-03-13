import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import type { SlashCommand } from '../types';
import { UserLevel } from '../../shared/models/UserLevel';
import { getLevelFromXp, getXpForLevel } from '../utils/levelUtils';
import { Op } from 'sequelize';

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

    // Rank position within guild (users with more XP are ranked above)
    const above = await UserLevel.count({
      where: { guildId, xp: { [Op.gt]: totalXp } },
    });
    const rank = above + 1;

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setAuthor({ name: target.displayName, iconURL: target.displayAvatarURL() })
      .setTitle(level === 0 ? 'Not ranked yet' : `Level ${level}`)
      .addFields(
        { name: 'Total XP', value: `${totalXp.toLocaleString()}`, inline: true },
        { name: 'Guild Rank', value: `#${rank}`, inline: true },
        {
          name: `Progress to Level ${level + 1}`,
          value: `${xpIntoLevel.toLocaleString()} / ${xpNeeded.toLocaleString()} XP`,
          inline: false,
        },
      );

    await interaction.reply({ embeds: [embed] });
  },
};
