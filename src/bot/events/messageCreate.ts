import { Events, Message, TextChannel } from 'discord.js';
import type { BotEvent } from '../types';
import { UserLevel } from '../../shared/models/UserLevel';
import { Guild } from '../../shared/models/Guild';
import {
  isOnCooldown,
  recordXpAwarded,
  randomXp,
  computeXpUpdate,
  formatLevelUpMessage,
} from '../utils/levelUtils';

const messageCreateEvent: BotEvent = {
  name: Events.MessageCreate,
  async execute(message: Message) {
    if (message.author.bot) return;
    if (message.system) return;
    if (!message.guildId) return;

    const { guildId } = message;
    const userId = message.author.id;

    if (isOnCooldown(guildId, userId)) return;

    const xpToAdd = randomXp();

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
        const guildRecord = await Guild.findByPk(guildId);
        const template = guildRecord?.levelUpMessage ?? null;
        const userMention = `<@${userId}>`;

        // Determine target channel: configured channel or same channel as message
        let targetChannel: { send: (content: string) => Promise<unknown> } =
          message.channel as { send: (content: string) => Promise<unknown> };

        if (guildRecord?.levelUpChannelId && message.guild) {
          try {
            const configured = await message.guild.channels.fetch(guildRecord.levelUpChannelId);
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
      }
    } catch (err) {
      console.error('[Leveling] Failed to process XP for message:', err);
    }
  },
};

export default messageCreateEvent;
