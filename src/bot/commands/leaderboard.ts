import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import type { SlashCommand } from '../types';
import { UserLevel } from '../../shared/models/UserLevel';
import { Op } from 'sequelize';

const TOP_N = 10;

export const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show the top members by XP in this server'),

  async execute(interaction) {
    await interaction.deferReply();

    const guildId = interaction.guildId!;

    const topRecords = await UserLevel.findAll({
      where: { guildId, xp: { [Op.gt]: 0 } },
      order: [['xp', 'DESC']],
      limit: TOP_N,
    });

    if (topRecords.length === 0) {
      await interaction.editReply('No one has earned any XP in this server yet.');
      return;
    }

    // Build leaderboard lines
    const lines: string[] = await Promise.all(
      topRecords.map(async (record, idx) => {
        let username: string;
        try {
          const member = await interaction.guild!.members.fetch(record.userId);
          username = member.displayName;
        } catch {
          username = `<@${record.userId}>`;
        }
        return `**${idx + 1}.** ${username} — Level ${record.level} (${record.xp.toLocaleString()} XP)`;
      }),
    );

    // Check if invoking user is outside top 10
    const userId = interaction.user.id;
    const isInTop = topRecords.some((r) => r.userId === userId);
    let footerLine = '';

    if (!isInTop) {
      const userRecord = await UserLevel.findOne({ where: { guildId, userId } });
      if (userRecord && userRecord.xp > 0) {
        const userRank = await UserLevel.count({
          where: { guildId, xp: { [Op.gt]: userRecord.xp } },
        }).then((above) => above + 1);
        footerLine = `\n— Your rank: **#${userRank}** (Level ${userRecord.level}, ${userRecord.xp.toLocaleString()} XP)`;
      }
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`XP Leaderboard — Top ${topRecords.length}`)
      .setDescription(lines.join('\n') + footerLine);

    await interaction.editReply({ embeds: [embed] });
  },
};
