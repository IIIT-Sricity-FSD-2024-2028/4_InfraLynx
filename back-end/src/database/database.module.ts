import { Global, Module } from '@nestjs/common';
import { Pool } from 'pg';

export const DB_POOL = 'DB_POOL';

const dbProvider = {
  provide: DB_POOL,
  useFactory: () => {
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('sslmode=require')
        ? { rejectUnauthorized: false }
        : false,
    });
  },
};

@Global()
@Module({
  providers: [dbProvider],
  exports: [dbProvider],
})
export class DatabaseModule {}
