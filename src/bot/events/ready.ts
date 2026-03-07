import { Events, Client, ActivityType } from 'discord.js';
import type { BotEvent, SlashCommand } from '../types';
import { registerCommands } from '../registerCommands';

function createEvent(commands: Map<string, SlashCommand>): BotEvent {
  return {
    name: Events.ClientReady,
    once: true,
    async execute(client: Client) {
      if (!client.user || !client.application) return;
      console.log(`[Bot] Ready! Logged in as ${client.user.tag}`);
      console.log(`[Bot] Serving ${client.guilds.cache.size} guild(s)`);
      client.user.setActivity('your servers', { type: ActivityType.Watching });

      await registerCommands(
        client.token!,
        client.application.id,
        commands,
        process.env['GUILD_ID'],
      ).catch((err: unknown) => {
        console.error('[Bot] Failed to register commands:', err);
      });
    },
  };
}

export default createEvent;
