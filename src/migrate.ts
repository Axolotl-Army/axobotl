/**
 * One-shot migration entry point.
 * Compiled to dist/migrate.js and run by the 'migrate' Docker Compose service
 * before the bot and dashboard start.
 */
import 'dotenv/config';
import sequelize from './shared/database';
import './shared/models';

async function migrate(): Promise<void> {
  console.log('[Migrate] Connecting to database...');
  await sequelize.authenticate();
  await sequelize.sync({ alter: true });
  console.log('[Migrate] Schema up to date');
  await sequelize.close();
}

migrate().catch((err: unknown) => {
  console.error('[Migrate] Failed:', err);
  process.exit(1);
});
