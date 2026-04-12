import { Events, Message, TextChannel } from 'discord.js';
import type { BotEvent } from '../types';
import { UserLevel } from '../../shared/models/UserLevel';
import { LevelRole } from '../../shared/models/LevelRole';
import {
  isOnCooldown,
  recordXpAwarded,
  randomXp,
  computeXpUpdate,
  formatLevelUpMessage,
  formatRewardMessage,
  computeRoleRewardActions,
  passesChannelFilter,
  passesRoleFilter,
  computeRoleMultiplier,
} from '../utils/levelUtils';
import type { RoleMultiplierEntry, RoleMultiplierMode } from '../utils/levelUtils';
import { pluginCache } from '../plugins';

const messageCreateEvent: BotEvent = {
  name: Events.MessageCreate,
  async execute(message: Message) {
    if (message.author.bot) return;
    if (message.system) return;
    if (!message.guildId) return;

    const { guildId } = message;
    const userId = message.author.id;

    // Check if leveling plugin is enabled for this guild
    const isLevelingEnabled = await pluginCache.isEnabled(guildId, 'leveling');
    if (!isLevelingEnabled) return;

    // Load plugin config
    const config = await pluginCache.getConfig(guildId, 'leveling');

    // Channel filter — check before anything else (no member fetch needed)
    const channelFilterMode = (config['channelFilterMode'] as 'include' | 'exclude') ?? 'include';
    const channelFilterIds = (config['channelFilterIds'] as string[]) ?? [];
    if (!passesChannelFilter(message.channelId, channelFilterMode, channelFilterIds)) return;

    // Role filter and role multipliers both need member roles — fetch once
    const roleFilterMode = (config['roleFilterMode'] as 'include' | 'exclude') ?? 'include';
    const roleFilterIds = (config['roleFilterIds'] as string[]) ?? [];
    const roleMultipliers = (config['roleMultipliers'] as RoleMultiplierEntry[]) ?? [];
    const roleMultiplierMode = (config['roleMultiplierMode'] as RoleMultiplierMode) ?? 'highest';

    const needsMember = roleFilterIds.length > 0 || roleMultipliers.length > 0;
    let memberRoleIds: Set<string> | null = null;

    if (needsMember) {
      const member = message.member ?? await message.guild?.members.fetch(userId).catch(() => null);
      if (!member) return;
      memberRoleIds = new Set(member.roles.cache.keys());

      if (roleFilterIds.length > 0 && !passesRoleFilter(memberRoleIds, roleFilterMode, roleFilterIds)) return;
    }

    const xpMin = (config['xpMin'] as number) ?? 7;
    const xpMax = (config['xpMax'] as number) ?? 13;
    const cooldownMs = (config['cooldownMs'] as number) ?? 60000;

    if (isOnCooldown(guildId, userId, Date.now(), cooldownMs)) return;

    const rawXp = randomXp(xpMin, xpMax);
    const roleMultiplier = memberRoleIds && roleMultipliers.length > 0
      ? computeRoleMultiplier(memberRoleIds, roleMultipliers, roleMultiplierMode)
      : 1.0;
    const xpToAdd = Math.round(rawXp * roleMultiplier);

    try {
      const [record] = await UserLevel.findOrCreate({
        where: { guildId, userId },
        defaults: { guildId, userId, xp: 0, level: 0, lastXpAt: null },
      });

      const oldXp = record.xp;
      const result = computeXpUpdate(record.xp, xpToAdd);

      await record.update({
        xp: result.newXp,
        level: result.newLevel,
        lastXpAt: new Date(),
      });

      // Record cooldown only after a successful DB write
      recordXpAwarded(guildId, userId);

      if (result.shouldNotify) {
        const template = (config['levelUpMessage'] as string | null) ?? null;
        const levelUpChannelId = (config['levelUpChannelId'] as string | null) ?? null;
        const userMention = `<@${userId}>`;

        // Determine target channel: configured channel or same channel as message
        let targetChannel: { send: (content: string) => Promise<unknown> } =
          message.channel as { send: (content: string) => Promise<unknown> };

        if (levelUpChannelId && message.guild) {
          try {
            const configured = await message.guild.channels.fetch(levelUpChannelId);
            if (configured instanceof TextChannel) {
              targetChannel = configured;
            }
          } catch {
            // Channel doesn't exist or bot lacks access -- fall back to message channel
          }
        }

        for (const lvl of result.levelsToAnnounce) {
          const msg = formatLevelUpMessage(template, {
            userMention,
            level: lvl,
            oldLevel: result.oldLevel,
            xp: result.newXp,
            oldXp,
          });
          await targetChannel.send(msg);
        }

        // Award role rewards for all levels up to the new level
        const rewardTemplate = (config['rewardMessage'] as string | null) ?? null;
        await awardRoleRewards(message, guildId, userId, result.newLevel, result.levelsGained, targetChannel, rewardTemplate);
      }
    } catch (err) {
      console.error('[Leveling] Failed to process XP for message:', err);
    }
  },
};

async function awardRoleRewards(
  message: Message,
  guildId: string,
  userId: string,
  currentLevel: number,
  levelsGained: number[],
  targetChannel: { send: (content: string) => Promise<unknown> },
  rewardTemplate: string | null,
): Promise<void> {
  if (!message.guild) return;

  const levelRoles = await LevelRole.findAll({
    where: { guildId },
    order: [['level', 'ASC']],
  });

  if (levelRoles.length === 0) return;

  try {
    const member = await message.guild.members.fetch(userId);
    const memberRoleIds = new Set(member.roles.cache.keys());

    const { toAdd, toRemove } = computeRoleRewardActions(
      levelRoles.map((lr) => ({ level: lr.level, roleId: lr.roleId, cumulative: lr.cumulative })),
      currentLevel,
      memberRoleIds,
    );

    const descriptionByRoleId = new Map<string, string>();
    const levelByRoleId = new Map<string, number>();
    for (const lr of levelRoles) {
      if (lr.roleId) {
        descriptionByRoleId.set(lr.roleId, lr.description ?? '');
        levelByRoleId.set(lr.roleId, lr.level);
      }
    }

    for (const roleId of toAdd) {
      try {
        await member.roles.add(roleId);

        const role = message.guild.roles.cache.get(roleId) ?? await message.guild.roles.fetch(roleId).catch(() => null);
        const roleName = role?.name ?? 'role';
        const roleMention = role ? `<@&${roleId}>` : roleName;

        const rewardMsg = formatRewardMessage(rewardTemplate, {
          userMention: `<@${userId}>`,
          level: levelByRoleId.get(roleId) ?? currentLevel,
          roleMention,
          roleName,
          reward: descriptionByRoleId.get(roleId) ?? '',
        });

        try {
          await targetChannel.send(rewardMsg);
        } catch (err) {
          console.warn(`[Leveling] Failed to send reward message for role ${roleId}:`, err);
        }
      } catch (err) {
        console.warn(`[Leveling] Failed to assign role ${roleId} to ${userId}:`, err);
      }
    }

    // Announce role-less milestone rewards for levels just crossed
    const gainedSet = new Set(levelsGained);
    const earnedMilestones = levelRoles.filter(
      (lr) => lr.roleId === null && gainedSet.has(lr.level),
    );
    for (const milestone of earnedMilestones) {
      if (!milestone.description?.trim()) continue;
      const rewardMsg = formatRewardMessage(rewardTemplate, {
        userMention: `<@${userId}>`,
        level: milestone.level,
        roleMention: '',
        roleName: '',
        reward: milestone.description.trim(),
      });
      try {
        await targetChannel.send(rewardMsg);
      } catch (err) {
        console.warn(`[Leveling] Failed to send milestone message for level ${milestone.level}:`, err);
      }
    }

    for (const roleId of toRemove) {
      if (memberRoleIds.has(roleId)) {
        try {
          await member.roles.remove(roleId);
        } catch (err) {
          console.warn(`[Leveling] Failed to remove role ${roleId} from ${userId}:`, err);
        }
      }
    }
  } catch (err) {
    console.warn(`[Leveling] Failed to fetch member ${userId} for role rewards:`, err);
  }
}

export default messageCreateEvent;
