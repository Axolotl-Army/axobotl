/**
 * Sync Sequelize models to the database.
 * Run with: pnpm db:sync
 *
 * WARNING: In production, use proper migrations instead of sync.
 */
import 'dotenv/config';
import sequelize from '../src/shared/database';
import '../src/shared/models';

async function sync(): Promise<void> {
  const force = process.argv.includes('--force');

  if (force) {
    console.warn('WARNING: --force will DROP and recreate all tables!');
    await new Promise((r) => setTimeout(r, 3000));
  }

  console.log('Syncing database...');
  await sequelize.authenticate();
  await sequelize.sync({ force, alter: !force });
  console.log('✓ Database synced successfully');
  await sequelize.close();
}

sync().catch((err: unknown) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
