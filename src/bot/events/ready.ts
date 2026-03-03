import { Events, Client, ActivityType } from 'discord.js';
import type { BotEvent } from '../types';

const event: BotEvent = {
  name: Events.ClientReady,
  once: true,
  execute(client: Client) {
    if (!client.user) return;
    console.log(`[Bot] Ready! Logged in as ${client.user.tag}`);
    console.log(`[Bot] Serving ${client.guilds.cache.size} guild(s)`);
    client.user.setActivity('your servers', { type: ActivityType.Watching });
  },
};

export default event;
