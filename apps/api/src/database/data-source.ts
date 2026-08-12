import { config as loadDotenv } from 'dotenv';
import { join } from 'path';
import { DataSource, type DataSourceOptions } from 'typeorm';

// The TypeORM CLI boots this file outside Nest, so nothing has loaded .env yet.
loadDotenv();

/**
 * The one options object. `app.module.ts` feeds the exact same value to
 * `TypeOrmModule.forRootAsync`, so the CLI and the running app can never drift.
 *
 * Globs are resolved relative to this file: under ts-node they land on
 * `src/entities/*.entity.ts`, and from `dist` on `dist/entities/*.entity.js`.
 */
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === 'true'
      ? { rejectUnauthorized: false }
      : false,
  entities: [join(__dirname, '..', 'entities', '*.entity{.ts,.js}')],
  migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
  synchronize: false,
  migrationsRun: false,
  logging:
    process.env.NODE_ENV === 'development'
      ? ['error', 'warn', 'migration', 'schema']
      : ['error'],
};

export default new DataSource(dataSourceOptions);
