/**
 * Deploy slash commands to Discord.
 * Run with: pnpm deploy-commands
 *
 * Set GUILD_ID in .env to deploy to a specific guild (instant) during development.
 * Leave GUILD_ID unset to deploy globally (takes up to 1 hour to propagate).
 */
import 'dotenv/config';
import { command as pingCommand } from '../src/bot/commands/ping';
import { command as helpCommand } from '../src/bot/commands/help';
import { registerCommands } from '../src/bot/registerCommands';
import type { SlashCommand } from '../src/bot/types';

const token = process.env['DISCORD_TOKEN'];
const clientId = process.env['DISCORD_CLIENT_ID'];
const guildId = process.env['GUILD_ID'];

if (!token || !clientId) {
  throw new Error('DISCORD_TOKEN and DISCORD_CLIENT_ID must be set in .env');
}

const commands = new Map<string, SlashCommand>([
  ['ping', pingCommand],
  ['help', helpCommand],
]);

registerCommands(token, clientId, commands, guildId).catch((err: unknown) => {
  console.error('Failed to deploy commands:', err);
  process.exit(1);
});
