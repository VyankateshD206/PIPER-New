import 'server-only';

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	throw new Error('Missing DATABASE_URL environment variable');
}

const globalForDb = globalThis as unknown as {
	__dbPool?: Pool;
};

const pool =
	globalForDb.__dbPool ??
	new Pool({
		connectionString: databaseUrl,
	});

if (process.env.NODE_ENV !== 'production') {
	globalForDb.__dbPool = pool;
}

export const db = drizzle(pool);
