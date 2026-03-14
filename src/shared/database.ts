import { Sequelize } from 'sequelize';
import pg from 'pg';
import 'dotenv/config';

if (!process.env['DATABASE_URL']) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Pass pg via dialectModule so Sequelize uses this static import instead of
// its internal dynamic require('pg'). Webpack/Next.js standalone replaces
// dynamic requires with a dead stub, so without this the dashboard container
// throws "Please install pg package manually" at runtime.
const sequelize = new Sequelize(process.env['DATABASE_URL'], {
  dialect: 'postgres',
  dialectModule: pg,
  dialectOptions: {
    ssl: process.env['DB_SSL'] === 'true'
      ? { require: true, rejectUnauthorized: false }
      : false,
  },
  logging: process.env['NODE_ENV'] === 'development' ? console.log : false,
  pool: {
    max: 10,
    min: 2,
    acquire: 30_000,
    idle: 10_000,
  },
});

export default sequelize;
