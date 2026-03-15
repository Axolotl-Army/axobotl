import { Events, Client, ActivityType } from 'discord.js';
import type { BotEvent, SlashCommand } from '../types';
import { registerCommands } from '../registerCommands';
import { Guild } from '../../shared/models';

function createEvent(commands: Map<string, SlashCommand>): BotEvent {
  return {
    name: Events.ClientReady,
    once: true,
    async execute(client: Client) {
      if (!client.user || !client.application) return;
      console.log(`[Bot] Ready! Logged in as ${client.user.tag}`);
      console.log(`[Bot] Serving ${client.guilds.cache.size} guild(s)`);
      client.user.setActivity('your servers', { type: ActivityType.Watching });

      await Promise.all([
        registerCommands(
          client.token!,
          client.application.id,
          commands,
          process.env['GUILD_ID'],
        ),
        syncGuilds(client),
      ]).catch((err: unknown) => {
        console.error('[Bot] Startup task failed:', err);
      });
    },
  };
}

async function syncGuilds(client: Client): Promise<void> {
  const guilds = client.guilds.cache.map((g) => ({ id: g.id, name: g.name }));
  await Promise.all(guilds.map((g) => Guild.upsert(g)));
  console.log(`[Bot] Synced ${guilds.length} guild(s) to database`);
}

export default createEvent;
