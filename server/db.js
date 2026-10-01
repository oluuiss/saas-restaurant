import { neon } from '@neondatabase/serverless';

let client;

/** Cliente SQL (HTTP) do Neon. Uso: const sql = db(); await sql`select 1`. */
export function db() {
  if (!client) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL não configurada.');
    client = neon(process.env.DATABASE_URL);
  }
  return client;
}
