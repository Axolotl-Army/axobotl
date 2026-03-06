import { Sequelize } from 'sequelize';
import 'dotenv/config';

if (!process.env['DATABASE_URL']) {
  throw new Error('DATABASE_URL environment variable is required');
}

const sequelize = new Sequelize(process.env['DATABASE_URL'], {
  dialect: 'postgres',
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
