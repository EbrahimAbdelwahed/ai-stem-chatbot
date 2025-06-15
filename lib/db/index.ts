import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

declare global {
  // eslint-disable-next-line no-var
  var db: ReturnType<typeof drizzle<typeof schema>> | undefined;
}

const client = postgres(process.env.DATABASE_URL!);
export const db = global.db ?? drizzle(client, { schema });

if (process.env.NODE_ENV !== 'production') {
  global.db = db;
} 