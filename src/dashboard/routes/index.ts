import express, { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/auth';
import { Guild, CommandLog } from '../../shared/models';
import sequelize from '../../shared/database';
import { QueryTypes } from 'sequelize';

const router: express.Router = Router();

const webLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false });
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });

// ── Public routes ────────────────────────────────────────────────────

router.get('/', webLimiter, (req, res) => {
  if (req.isAuthenticated()) return res.redirect('/dashboard');
  res.redirect('/login');
});

router.get('/login', webLimiter, (req, res) => {
  if (req.isAuthenticated()) return res.redirect('/dashboard');
  const error = req.query['error'];
  res.render('login', {
    title: 'Login',
    error: error === 'auth_failed' ? 'Authentication failed. Please try again.' : null,
    user: req.user ?? null,
  });
});

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Protected routes ─────────────────────────────────────────────────

router.get('/dashboard', webLimiter, requireAuth, async (req, res) => {
  const [guildCount, totalCommands] = await Promise.all([
    Guild.count(),
    CommandLog.count(),
  ]);

  const recentLogs = await CommandLog.findAll({
    order: [['createdAt', 'DESC']],
    limit: 10,
  });

  res.render('dashboard/index', {
    title: 'Overview',
    page: 'home',
    user: req.user,
    stats: { guildCount, totalCommands },
    recentLogs,
  });
});

router.get('/dashboard/commands', webLimiter, requireAuth, async (req, res) => {
  const commandStats = await sequelize.query<{ command: string; count: string; last_used: Date }>(
    `SELECT command, COUNT(*) as count, MAX("createdAt") as last_used
     FROM command_logs
     GROUP BY command
     ORDER BY count DESC`,
    { type: QueryTypes.SELECT },
  );

  res.render('dashboard/commands', {
    title: 'Commands',
    page: 'commands',
    user: req.user,
    commandStats,
  });
});

router.get('/dashboard/logs', webLimiter, requireAuth, async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query['page'] ?? '1'), 10));
  const limit = 20;
  const offset = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    CommandLog.findAll({ order: [['createdAt', 'DESC']], limit, offset }),
    CommandLog.count(),
  ]);

  res.render('dashboard/logs', {
    title: 'Logs',
    page: 'logs',
    user: req.user,
    logs,
    pagination: {
      current: page,
      total: Math.ceil(total / limit),
      totalEntries: total,
    },
  });
});

// ── API routes (v1) ───────────────────────────────────────────────────

router.get('/api/v1/stats', apiLimiter, requireAuth, async (_req, res) => {
  const [guildCount, totalCommands] = await Promise.all([
    Guild.count(),
    CommandLog.count(),
  ]);
  res.json({ guildCount, totalCommands });
});

router.get('/api/v1/guilds', apiLimiter, requireAuth, async (_req, res) => {
  const guilds = await Guild.findAll({ order: [['name', 'ASC']] });
  res.json(guilds);
});

export default router;
