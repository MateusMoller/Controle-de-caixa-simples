import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const entries = pgTable("entries", {
  id: serial("id").primaryKey(),
  groupId: text("group_id").notNull(),
  description: text("description").notNull(),
  contact: text("contact").notNull().default(""),
  category: text("category").notNull(),
  type: text("type", { enum: ["income", "expense"] }).notNull(),
  amountCents: integer("amount_cents").notNull(),
  paidAmountCents: integer("paid_amount_cents").notNull().default(0),
  issueDate: text("issue_date").notNull(),
  dueDate: text("due_date").notNull(),
  settlementDate: text("settlement_date"),
  paymentMethod: text("payment_method").notNull().default("Não informado"),
  installment: integer("installment").notNull().default(1),
  installments: integer("installments").notNull().default(1),
  interestType: text("interest_type", { enum: ["none", "simple", "compound"] }).notNull().default("none"),
  interestRateBps: integer("interest_rate_bps").notNull().default(0),
  paid: boolean("paid").notNull().default(false),
  createdBy: text("created_by").notNull().default("sistema"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const incomeTypes = pgTable("income_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const expenseTypes = pgTable("expense_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});
