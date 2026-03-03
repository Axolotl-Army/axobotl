import { Events, Guild as DiscordGuild } from 'discord.js';
import type { BotEvent } from '../types';
import { Guild } from '../../shared/models';

const event: BotEvent = {
  name: Events.GuildCreate,
  async execute(guild: DiscordGuild) {
    console.log(`[Bot] Joined guild: ${guild.name} (${guild.id})`);
    await Guild.upsert({ id: guild.id, name: guild.name });
  },
};

export default event;
