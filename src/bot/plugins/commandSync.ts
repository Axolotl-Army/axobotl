import { Client, REST, Routes } from 'discord.js';
import { pluginRegistry } from './registry';
import { pluginCache } from './pluginCache';
import { Guild } from '../../shared/models';
import type { SlashCommand } from '../types';

let _baseCommands = new Map<string, SlashCommand>();

export function setBaseCommands(commands: Map<string, SlashCommand>): void {
  _baseCommands = commands;
}

export async function syncGuildCommands(
  token: string,
  clientId: string,
  guildId: string,
): Promise<void> {
  const body = [];

  // Add base commands that are not disabled for this guild
  const guild = await Guild.findByPk(guildId);
  const disabled = guild?.disabledCommands ?? [];
  for (const [name, cmd] of _baseCommands) {
    if (!disabled.includes(name)) {
      body.push(cmd.data.toJSON());
    }
  }

  // Add enabled plugin commands
  const enabledPluginIds = await pluginCache.getEnabledPluginIds(guildId);
  for (const pluginId of enabledPluginIds) {
    const plugin = pluginRegistry.get(pluginId);
    if (plugin) {
      body.push(...plugin.commands.map((cmd) => cmd.data.toJSON()));
    }
  }

  const rest = new REST().setToken(token);
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body });
  console.log(`[Commands] Synced ${body.length} command(s) for guild ${guildId}`);
}

export async function clearGlobalCommands(
  token: string,
  clientId: string,
): Promise<void> {
  const rest = new REST().setToken(token);
  await rest.put(Routes.applicationCommands(clientId), { body: [] });
  console.log('[Commands] Cleared global commands');
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
    console.error(`[Commands] Failed to sync commands for ${failed.length} guild(s)`);
  }
}
