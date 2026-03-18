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
  computeRoleRewardActions,
} from '../utils/levelUtils';
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
    const xpMin = (config['xpMin'] as number) ?? 7;
    const xpMax = (config['xpMax'] as number) ?? 13;
    const cooldownMs = (config['cooldownMs'] as number) ?? 60000;
    const xpMultiplier = (config['xpMultiplier'] as number) ?? 1.0;

    if (isOnCooldown(guildId, userId, Date.now(), cooldownMs)) return;

    const rawXp = randomXp(xpMin, xpMax);
    const xpToAdd = Math.round(rawXp * xpMultiplier);

    try {
      const [record] = await UserLevel.findOrCreate({
        where: { guildId, userId },
        defaults: { guildId, userId, xp: 0, level: 0, lastXpAt: null },
      });

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
          const msg = formatLevelUpMessage(template, userMention, lvl);
          await targetChannel.send(msg);
        }

        // Award role rewards for all levels up to the new level
        await awardRoleRewards(message, guildId, userId, result.newLevel);
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

    for (const roleId of toAdd) {
      try {
        await member.roles.add(roleId);
      } catch (err) {
        console.warn(`[Leveling] Failed to assign role ${roleId} to ${userId}:`, err);
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
