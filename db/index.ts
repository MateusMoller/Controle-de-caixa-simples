import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não está configurada. Conecte um banco Neon ao projeto na Vercel.");
  return drizzle(neon(url), { schema });
}

let database: ReturnType<typeof createDb> | null = null;
let initialization: Promise<void> | null = null;

export function getDb() {
  if (!database) database = createDb();
  return database;
}

export async function ensureDatabase() {
  if (!initialization) {
    initialization = (async () => {
      const url = process.env.DATABASE_URL;
      if (!url) throw new Error("DATABASE_URL não está configurada. Conecte um banco Neon ao projeto na Vercel.");
      const sql = neon(url);
      await sql`CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS users_single_admin_idx ON users ((TRUE))`;
      await sql`CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at)`;
      await sql`CREATE TABLE IF NOT EXISTS entries (
        id SERIAL PRIMARY KEY,
        group_id TEXT NOT NULL,
        description TEXT NOT NULL,
        contact TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        amount_cents INTEGER NOT NULL,
        due_date TEXT NOT NULL,
        installment INTEGER NOT NULL DEFAULT 1,
        installments INTEGER NOT NULL DEFAULT 1,
        interest_type TEXT NOT NULL DEFAULT 'none',
        interest_rate_bps INTEGER NOT NULL DEFAULT 0,
        paid BOOLEAN NOT NULL DEFAULT FALSE
      )`;
      await sql`CREATE TABLE IF NOT EXISTS income_types (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE)`;
      await sql`CREATE TABLE IF NOT EXISTS expense_types (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE)`;
      await sql`INSERT INTO income_types (name) VALUES ('Vendas'), ('Serviços'), ('Comissões'), ('Outros') ON CONFLICT (name) DO NOTHING`;
      await sql`INSERT INTO expense_types (name) VALUES ('Fornecedores'), ('Moradia'), ('Transporte'), ('Alimentação'), ('Saúde'), ('Lazer'), ('Impostos'), ('Outros') ON CONFLICT (name) DO NOTHING`;
    })();
  }
  return initialization;
}
