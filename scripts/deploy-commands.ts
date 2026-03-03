/**
 * Deploy slash commands to Discord.
 * Run with: pnpm deploy-commands
 *
 * Set GUILD_ID in .env to deploy to a specific guild (instant) during development.
 * Leave GUILD_ID unset to deploy globally (takes up to 1 hour to propagate).
 */
import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import { command as pingCommand } from '../src/bot/commands/ping';
import { command as helpCommand } from '../src/bot/commands/help';

const token = process.env['DISCORD_TOKEN'];
const clientId = process.env['DISCORD_CLIENT_ID'];
const guildId = process.env['GUILD_ID'];

if (!token || !clientId) {
  throw new Error('DISCORD_TOKEN and DISCORD_CLIENT_ID must be set in .env');
}

const commands = [pingCommand, helpCommand].map((cmd) => cmd.data.toJSON());
const rest = new REST().setToken(token);

async function deploy(): Promise<void> {
  console.log(`Deploying ${commands.length} slash command(s)...`);

  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log(`✓ Deployed to guild ${guildId} (instant)`);
  } else {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log('✓ Deployed globally (may take up to 1 hour to propagate)');
  }
}

deploy().catch((err: unknown) => {
  console.error('Failed to deploy commands:', err);
  process.exit(1);
});
