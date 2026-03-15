import {
  SlashCommandBuilder,
  MessageFlags,
  ComponentType,
  type ActionRowBuilder,
  type MessageActionRowComponentBuilder,
} from 'discord.js';
import type { SlashCommand } from '../types';
import { UserLevel } from '../../shared/models/UserLevel';
import { Op } from 'sequelize';
import {
  createContainer,
  createTitle,
  createText,
  createSeparator,
  createPageFooter,
  createPaginationRow,
  disableAllButtons,
} from '../utils/componentBuilders';

const PAGE_SIZE = 10;
const COLLECTOR_TIMEOUT = 300_000; // 5 minutes

async function getTotalCount(guildId: string): Promise<number> {
  return UserLevel.count({ where: { guildId, xp: { [Op.gt]: 0 } } });
}

async function getPage(guildId: string, page: number): Promise<UserLevel[]> {
  return UserLevel.findAll({
    where: { guildId, xp: { [Op.gt]: 0 } },
    order: [['xp', 'DESC']],
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });
}

async function getUserRank(guildId: string, userId: string): Promise<{ rank: number; record: UserLevel } | null> {
  const record = await UserLevel.findOne({ where: { guildId, userId } });
  if (!record || record.xp <= 0) return null;
  const above = await UserLevel.count({ where: { guildId, xp: { [Op.gt]: record.xp } } });
  return { rank: above + 1, record };
}

async function buildLeaderboardLines(
  records: UserLevel[],
  startRank: number,
  guild: import('discord.js').Guild,
): Promise<string[]> {
  return Promise.all(
    records.map(async (record, idx) => {
      let username: string;
      try {
        const member =
          guild.members.cache.get(record.userId) ??
          await guild.members.fetch(record.userId);
        username = member.displayName;
      } catch {
        username = `<@${record.userId}>`;
      }
      const rank = startRank + idx;
      return `**${rank}.** ${username} -- Level ${record.level} (${record.xp.toLocaleString()} XP)`;
    }),
  );
}

function buildMessage(
  lines: string[],
  page: number,
  totalPages: number,
  userId: string,
  guildId: string,
  myRankDisabled: boolean,
) {
  const container = createContainer()
    .addTextDisplayComponents(createTitle('XP Leaderboard'))
    .addSeparatorComponents(createSeparator());

  if (lines.length === 0) {
    container.addTextDisplayComponents(createText('No one has earned any XP in this server yet.'));
  } else {
    for (const line of lines) {
      container.addTextDisplayComponents(createText(line));
    }
  }

  container
    .addSeparatorComponents(createSeparator())
    .addTextDisplayComponents(createPageFooter(page, totalPages));

  const actionRow = createPaginationRow('lb', userId, guildId, page, totalPages, myRankDisabled);

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [container, actionRow],
  } as const;
}

export const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show the top members by XP in this server'),

  async execute(interaction) {
    const guildId = interaction.guildId!;
    const userId = interaction.user.id;

    const totalCount = await getTotalCount(guildId);
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    const page = 1;

    const records = await getPage(guildId, page);
    const lines = await buildLeaderboardLines(records, 1, interaction.guild!);

    const userRank = await getUserRank(guildId, userId);
    const myRankDisabled = userRank === null;

    const msg = buildMessage(lines, page, totalPages, userId, guildId, myRankDisabled);
    const { resource } = await interaction.reply({ ...msg, withResponse: true });
    const message = resource!.message!;

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (i) => i.user.id === userId,
      time: COLLECTOR_TIMEOUT,
    });

    let currentPage = page;

    collector.on('collect', async (i) => {
      const action = i.customId.split(':')[1];

      if (action === 'first') {
        currentPage = 1;
      } else if (action === 'prev') {
        currentPage = Math.max(1, currentPage - 1);
      } else if (action === 'next') {
        const freshTotal = Math.max(1, Math.ceil(await getTotalCount(guildId) / PAGE_SIZE));
        currentPage = Math.min(freshTotal, currentPage + 1);
      } else if (action === 'last') {
        currentPage = Math.max(1, Math.ceil(await getTotalCount(guildId) / PAGE_SIZE));
      } else if (action === 'myrank') {
        const rank = await getUserRank(guildId, userId);
        if (rank) {
          currentPage = Math.ceil(rank.rank / PAGE_SIZE);
        }
      }

      const freshTotal = await getTotalCount(guildId);
      const freshTotalPages = Math.max(1, Math.ceil(freshTotal / PAGE_SIZE));
      currentPage = Math.min(currentPage, freshTotalPages);

      const pageRecords = await getPage(guildId, currentPage);
      const startRank = (currentPage - 1) * PAGE_SIZE + 1;
      const pageLines = await buildLeaderboardLines(pageRecords, startRank, interaction.guild!);

      const freshUserRank = await getUserRank(guildId, userId);
      const updated = buildMessage(pageLines, currentPage, freshTotalPages, userId, guildId, freshUserRank === null);

      await i.update(updated);
    });

    collector.on('end', async () => {
      try {
        const freshTotal = await getTotalCount(guildId);
        const freshTotalPages = Math.max(1, Math.ceil(freshTotal / PAGE_SIZE));
        const pageRecords = await getPage(guildId, currentPage);
        const startRank = (currentPage - 1) * PAGE_SIZE + 1;
        const pageLines = await buildLeaderboardLines(pageRecords, startRank, interaction.guild!);

        const container = createContainer()
          .addTextDisplayComponents(createTitle('XP Leaderboard'))
          .addSeparatorComponents(createSeparator());

        for (const line of pageLines) {
          container.addTextDisplayComponents(createText(line));
        }

        container
          .addSeparatorComponents(createSeparator())
          .addTextDisplayComponents(createPageFooter(currentPage, freshTotalPages));

        const disabledRow = disableAllButtons(
          createPaginationRow('lb', userId, guildId, currentPage, freshTotalPages, true),
        );

        await interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [container, disabledRow],
        });
      } catch {
        // Message may have been deleted
      }
    });
  },
};
