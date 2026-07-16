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
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email')
          AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'username') THEN
          ALTER TABLE users RENAME COLUMN email TO username;
        END IF;
      END $$`;
      await sql`CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at)`;
      await sql`DROP INDEX IF EXISTS users_single_admin_idx`;
      await sql`DELETE FROM users WHERE username NOT IN ('alex', 'carla', 'duda', 'igor')`;
      await sql`INSERT INTO users (username, password_hash) VALUES
        ('alex', '5ccb3098c43e49d96bc5e340f1f13bfe:9d91429b9f5ca0d20914914ec3789c2876c3b3d3e1da87efb210610bf922b5ef2af5b37ff9e9d48c07b89e9a453c28a37122d333cc7f9c8e869a9ddfd9a9be50'),
        ('carla', '5ccb3098c43e49d96bc5e340f1f13bfe:9d91429b9f5ca0d20914914ec3789c2876c3b3d3e1da87efb210610bf922b5ef2af5b37ff9e9d48c07b89e9a453c28a37122d333cc7f9c8e869a9ddfd9a9be50'),
        ('duda', '5ccb3098c43e49d96bc5e340f1f13bfe:9d91429b9f5ca0d20914914ec3789c2876c3b3d3e1da87efb210610bf922b5ef2af5b37ff9e9d48c07b89e9a453c28a37122d333cc7f9c8e869a9ddfd9a9be50'),
        ('igor', '5ccb3098c43e49d96bc5e340f1f13bfe:9d91429b9f5ca0d20914914ec3789c2876c3b3d3e1da87efb210610bf922b5ef2af5b37ff9e9d48c07b89e9a453c28a37122d333cc7f9c8e869a9ddfd9a9be50')
        ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`;
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
