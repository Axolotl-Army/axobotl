import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import pgSession from 'connect-pg-simple';
import path from 'path';

import sequelize from '../shared/database';
import '../shared/models'; // register associations
import mainRouter from './routes/index';
import authRouter from './routes/auth';
import { notFound, errorHandler } from './middleware/errorHandler';

// ── Environment validation ───────────────────────────────────────────
const requiredEnv = ['DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET', 'SESSION_SECRET', 'DATABASE_URL'];
for (const key of requiredEnv) {
  if (!process.env[key]) throw new Error(`${key} environment variable is required`);
}

// ── Express setup ────────────────────────────────────────────────────
const app = express();
const PgStore = pgSession(session);

app.set('trust proxy', 1); // trust first hop (Docker network / reverse proxy)
app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'views'));
app.use(express.static(path.join(process.cwd(), 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ── Session ──────────────────────────────────────────────────────────
app.use(
  session({
    store: new PgStore({ conString: process.env['DATABASE_URL'], createTableIfMissing: true }),
    secret: process.env['SESSION_SECRET']!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env['SESSION_SECURE_COOKIE'] === 'true',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }),
);

// ── Passport (Discord OAuth2) ─────────────────────────────────────────
passport.use(
  new DiscordStrategy(
    {
      clientID: process.env['DISCORD_CLIENT_ID']!,
      clientSecret: process.env['DISCORD_CLIENT_SECRET']!,
      callbackURL: process.env['DISCORD_CALLBACK_URL'] ?? 'http://localhost:3000/auth/callback',
      scope: ['identify', 'guilds'],
    },
    (_accessToken, _refreshToken, profile, done) => done(null, profile),
  ),
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user as Express.User));

app.use(passport.initialize());
app.use(passport.session());

// ── Routes ────────────────────────────────────────────────────────────
app.use('/auth', authRouter);
app.use('/', mainRouter);

// ── Error handling ────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Startup ───────────────────────────────────────────────────────────
const PORT = parseInt(process.env['PORT'] ?? process.env['DASHBOARD_PORT'] ?? '3000', 10);

async function start(): Promise<void> {
  console.log('[Dashboard] Connecting to database...');
  await sequelize.authenticate();
  await sequelize.sync({ alter: true });
  console.log('[Dashboard] Database connected');

  await new Promise<void>((resolve) => app.listen(PORT, () => resolve()));
  console.log(`[Dashboard] Running at http://localhost:${PORT}`);
}

// ── Graceful shutdown ─────────────────────────────────────────────────
async function shutdown(signal: string): Promise<void> {
  console.log(`[Dashboard] Received ${signal}, shutting down...`);
  await sequelize.close();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  console.error('[Dashboard] Uncaught Exception:', err);
  void shutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
  console.error('[Dashboard] Unhandled Rejection:', reason);
  void shutdown('unhandledRejection');
});

start().catch((err: unknown) => {
  console.error('[Dashboard] Failed to start:', err);
  process.exit(1);
});
