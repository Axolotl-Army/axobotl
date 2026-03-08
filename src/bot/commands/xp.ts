import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
} from 'discord.js';
import type { SlashCommand } from '../types';
import { UserLevel } from '../../shared/models/UserLevel';
import { computeXpUpdate, formatLevelUpMessage } from '../utils/levelUtils';
import { Guild } from '../../shared/models/Guild';

const AMOUNT_MIN = 1;
const AMOUNT_MAX = 100_000;
const SET_MAX = 10_000_000;

export const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('xp')
    .setDescription('Manage XP for server members (requires Manage Server)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Add XP to a member')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Target member').setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt
            .setName('amount')
            .setDescription(`Amount of XP to add (${AMOUNT_MIN}–${AMOUNT_MAX})`)
            .setMinValue(AMOUNT_MIN)
            .setMaxValue(AMOUNT_MAX)
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove XP from a member')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Target member').setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt
            .setName('amount')
            .setDescription(`Amount of XP to remove (${AMOUNT_MIN}–${AMOUNT_MAX})`)
            .setMinValue(AMOUNT_MIN)
            .setMaxValue(AMOUNT_MAX)
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('set')
        .setDescription('Set the exact XP for a member')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Target member').setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt
            .setName('amount')
            .setDescription(`Exact XP value to set (0–${SET_MAX})`)
            .setMinValue(0)
            .setMaxValue(SET_MAX)
            .setRequired(true),
        ),
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const target = interaction.options.getUser('user', true);
    const amount = interaction.options.getInteger('amount', true);
    const guildId = interaction.guildId!;

    if (target.bot) {
      await interaction.reply({
        content: 'Bots cannot earn XP.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const [record] = await UserLevel.findOrCreate({
      where: { guildId, userId: target.id },
      defaults: { guildId, userId: target.id, xp: 0, level: 0, lastXpAt: null },
    });

    let result: ReturnType<typeof computeXpUpdate>;

    if (sub === 'add') {
      result = computeXpUpdate(record.xp, amount, 'add');
    } else if (sub === 'remove') {
      result = computeXpUpdate(record.xp, -amount, 'add');
    } else {
      result = computeXpUpdate(record.xp, amount, 'set');
    }

    await record.update({ xp: result.newXp, level: result.newLevel });

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('XP Updated')
      .addFields(
        { name: 'Member', value: `<@${target.id}>`, inline: true },
        { name: 'New XP', value: result.newXp.toLocaleString(), inline: true },
        { name: 'New Level', value: String(result.newLevel), inline: true },
      );

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

    // Post level-up notifications in the channel if levels were gained via add/set
    if (result.shouldNotify && sub !== 'remove') {
      const guildRecord = await Guild.findByPk(guildId);
      const template = guildRecord?.levelUpMessage ?? null;
      const userMention = `<@${target.id}>`;

      for (const lvl of result.levelsToAnnounce) {
        const msg = formatLevelUpMessage(template, userMention, lvl);
        await interaction.followUp({ content: msg });
      }
    }
  },
};
