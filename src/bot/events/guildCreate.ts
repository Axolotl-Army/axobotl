import { Events, Guild as DiscordGuild } from 'discord.js';
import type { BotEvent } from '../types';
import { Guild } from '../../shared/models';
import { GuildPlugin } from '../../shared/models/GuildPlugin';
import { getAllPlugins, syncGuildCommands } from '../plugins';

const event: BotEvent = {
  name: Events.GuildCreate,
  async execute(guild: DiscordGuild) {
    console.log(`[Bot] Joined guild: ${guild.name} (${guild.id})`);
    await Guild.upsert({ id: guild.id, name: guild.name });

    // Initialize plugin entries (disabled by default)
    const plugins = getAllPlugins();
    await Promise.all(
      plugins.map((p) =>
        GuildPlugin.findOrCreate({
          where: { guildId: guild.id, pluginId: p.id },
          defaults: {
            guildId: guild.id,
            pluginId: p.id,
            enabled: false,
            config: p.defaultConfig,
          },
        }),
      ),
    );

    // Sync guild commands (will be empty since plugins default to disabled)
    if (guild.client.application) {
      await syncGuildCommands(
        guild.client.token!,
        guild.client.application.id,
        guild.id,
      ).catch((err: unknown) => {
        console.error(`[Plugins] Failed to sync commands for new guild ${guild.id}:`, err);
      });
    }
  },
};

export default event;
