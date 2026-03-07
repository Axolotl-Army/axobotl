import { REST, Routes } from 'discord.js';
import type { SlashCommand } from './types';

export async function registerCommands(
  token: string,
  clientId: string,
  commands: Map<string, SlashCommand>,
  guildId?: string,
): Promise<void> {
  const rest = new REST().setToken(token);
  const body = [...commands.values()].map((cmd) => cmd.data.toJSON());

  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body });
    console.log(`[Bot] Registered ${body.length} slash command(s) to guild ${guildId} (instant)`);
  } else {
    await rest.put(Routes.applicationCommands(clientId), { body });
    console.log(`[Bot] Registered ${body.length} slash command(s) globally`);
  }
}
