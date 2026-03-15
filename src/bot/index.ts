import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import sequelize from '../shared/database';
import '../shared/models'; // register associations
import type { SlashCommand } from './types';
import { registerPlugin } from './plugins';

// Base commands (registered per-guild, can be disabled via dashboard)
import { command as pingCommand } from './commands/ping';
import { command as helpCommand } from './commands/help';
import { command as infoCommand } from './commands/info';

// Plugin commands (registered per-guild when plugin is enabled)
import { command as rankCommand } from './commands/rank';
import { command as leaderboardCommand } from './commands/leaderboard';
import { command as xpCommand } from './commands/xp';
import { command as levelconfigCommand } from './commands/levelconfig';

// Events
import readyEvent from './events/ready';
import createInteractionEvent from './events/interactionCreate';
import guildCreateEvent from './events/guildCreate';
import messageCreateEvent from './events/messageCreate';

// ── Environment validation ──────────────────────────────────────────
const token = process.env['DISCORD_TOKEN'];
if (!token) throw new Error('DISCORD_TOKEN environment variable is required');

// ── Plugin registration ─────────────────────────────────────────────
registerPlugin({
  id: 'leveling',
  name: 'Leveling',
  description: 'Track XP from messages, level up, and earn role rewards',
  commands: [rankCommand, leaderboardCommand, xpCommand, levelconfigCommand],
  defaultConfig: {
    levelUpMessage: null,
    levelUpChannelId: null,
    xpMin: 7,
    xpMax: 13,
    cooldownMs: 60000,
    xpMultiplier: 1.0,
  },
});

// ── Client setup ────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

// ── Command registries ──────────────────────────────────────────────

// Base commands (for per-guild registration)
const baseCommands = new Map<string, SlashCommand>([
  ['ping', pingCommand],
  ['help', helpCommand],
  ['info', infoCommand],
]);

// All commands (for routing in interactionCreate)
const allCommands = new Map<string, SlashCommand>([
  ...baseCommands,
  ['rank', rankCommand],
  ['leaderboard', leaderboardCommand],
  ['xp', xpCommand],
  ['levelconfig', levelconfigCommand],
]);

// ── Event registration ──────────────────────────────────────────────
const events = [
  readyEvent(baseCommands),
  createInteractionEvent(allCommands),
  guildCreateEvent,
  messageCreateEvent,
];

for (const event of events) {
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

// ── Startup ─────────────────────────────────────────────────────────
async function start(): Promise<void> {
  console.log('[Bot] Connecting to database...');
  await sequelize.authenticate();
  await sequelize.sync({ alter: true });
  console.log('[Bot] Database connected');

  console.log('[Bot] Logging in to Discord...');
  await client.login(token);
}

// ── Graceful shutdown ────────────────────────────────────────────────
async function shutdown(signal: string): Promise<void> {
  console.log(`[Bot] Received ${signal}, shutting down...`);
  client.destroy();
  await sequelize.close();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  console.error('[Bot] Uncaught Exception:', err);
  void shutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
  console.error('[Bot] Unhandled Rejection:', reason);
  void shutdown('unhandledRejection');
});

start().catch((err: unknown) => {
  console.error('[Bot] Failed to start:', err);
  process.exit(1);
});
