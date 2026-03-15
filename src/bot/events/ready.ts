import { Events, Client, ActivityType } from 'discord.js';
import type { BotEvent, SlashCommand } from '../types';
import { registerCommands } from '../registerCommands';
import { Guild } from '../../shared/models';
import { GuildPlugin } from '../../shared/models/GuildPlugin';
import { pluginCache, syncAllGuildCommands, syncGuildCommands, getAllPlugins } from '../plugins';

function createEvent(baseCommands: Map<string, SlashCommand>): BotEvent {
  return {
    name: Events.ClientReady,
    once: true,
    async execute(client: Client) {
      if (!client.user || !client.application) return;
      console.log(`[Bot] Ready! Logged in as ${client.user.tag}`);
      console.log(`[Bot] Serving ${client.guilds.cache.size} guild(s)`);
      client.user.setActivity('your servers', { type: ActivityType.Watching });

      // Register base commands + sync guilds to DB
      await Promise.all([
        registerCommands(
          client.token!,
          client.application.id,
          baseCommands,
          process.env['GUILD_ID'],
        ),
        syncGuilds(client),
      ]).catch((err: unknown) => {
        console.error('[Bot] Startup task failed:', err);
      });

      // Migrate existing leveling config, then sync plugin commands
      await migrateExistingLevelingConfig();
      await pluginCache.refresh();
      await syncAllGuildCommands(client);

      // Periodic cache refresh + selective command sync
      setInterval(() => {
        void (async () => {
          try {
            const changedGuilds = await pluginCache.refresh();
            for (const guildId of changedGuilds) {
              await syncGuildCommands(
                client.token!,
                client.application!.id,
                guildId,
              );
            }
          } catch (err) {
            console.error('[Plugins] Cache refresh failed:', err);
          }
        })();
      }, 60_000);
    },
  };
}

async function syncGuilds(client: Client): Promise<void> {
  const guilds = client.guilds.cache.map((g) => ({ id: g.id, name: g.name }));
  await Promise.all(guilds.map((g) => Guild.upsert(g)));
  console.log(`[Bot] Synced ${guilds.length} guild(s) to database`);
}

async function migrateExistingLevelingConfig(): Promise<void> {
  const guilds = await Guild.findAll();
  const plugins = getAllPlugins();
  const levelingPlugin = plugins.find((p) => p.id === 'leveling');
  if (!levelingPlugin) return;

  let migrated = 0;
  for (const guild of guilds) {
    const [, created] = await GuildPlugin.findOrCreate({
      where: { guildId: guild.id, pluginId: 'leveling' },
      defaults: {
        guildId: guild.id,
        pluginId: 'leveling',
        enabled: true,
        config: {
          ...levelingPlugin.defaultConfig,
          levelUpMessage: guild.levelUpMessage ?? null,
          levelUpChannelId: guild.levelUpChannelId ?? null,
        },
      },
    });
    if (created) migrated++;
  }

  if (migrated > 0) {
    console.log(`[Migration] Migrated leveling config for ${migrated} guild(s)`);
  }
}

export default createEvent;
