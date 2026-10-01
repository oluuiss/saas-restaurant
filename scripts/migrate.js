// Aplica db/schema.sql no banco do DATABASE_URL (lido de .env.local se existir).
import { readFileSync, existsSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL && existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = /^([A-Z_]+)=(.*)$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
if (!process.env.DATABASE_URL) {
  console.error('Defina DATABASE_URL (ou crie .env.local).');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const statements = readFileSync('db/schema.sql', 'utf8')
  .replace(/--.*$/gm, '')
  .split(';').map((s) => s.trim()).filter(Boolean);

for (const statement of statements) await sql.query(statement);
console.log(`Esquema aplicado (${statements.length} comandos).`);
