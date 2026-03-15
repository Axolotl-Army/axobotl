import { Client, REST, Routes } from 'discord.js';
import { pluginRegistry } from './registry';
import { pluginCache } from './pluginCache';

export async function syncGuildCommands(
  token: string,
  clientId: string,
  guildId: string,
): Promise<void> {
  const enabledPluginIds = await pluginCache.getEnabledPluginIds(guildId);

  const body = [];
  for (const pluginId of enabledPluginIds) {
    const plugin = pluginRegistry.get(pluginId);
    if (plugin) {
      body.push(...plugin.commands.map((cmd) => cmd.data.toJSON()));
    }
  }

  const rest = new REST().setToken(token);
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body });
  console.log(`[Plugins] Synced ${body.length} plugin command(s) for guild ${guildId}`);
}

export async function syncAllGuildCommands(client: Client): Promise<void> {
  if (!client.application) return;

  const token = client.token!;
  const clientId = client.application.id;
  const guildIds = client.guilds.cache.map((g) => g.id);

  const results = await Promise.allSettled(
    guildIds.map((guildId) => syncGuildCommands(token, clientId, guildId)),
  );

  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length > 0) {
    console.error(`[Plugins] Failed to sync commands for ${failed.length} guild(s)`);
  }
}
