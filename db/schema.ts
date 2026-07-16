import { boolean, integer, pgTable, serial, text } from "drizzle-orm/pg-core";

export const entries = pgTable("entries", {
  id: serial("id").primaryKey(),
  groupId: text("group_id").notNull(),
  description: text("description").notNull(),
  contact: text("contact").notNull().default(""),
  category: text("category").notNull(),
  type: text("type", { enum: ["income", "expense"] }).notNull(),
  amountCents: integer("amount_cents").notNull(),
  dueDate: text("due_date").notNull(),
  installment: integer("installment").notNull().default(1),
  installments: integer("installments").notNull().default(1),
  interestType: text("interest_type", { enum: ["none", "simple", "compound"] }).notNull().default("none"),
  interestRateBps: integer("interest_rate_bps").notNull().default(0),
  paid: boolean("paid").notNull().default(false),
});

export const incomeTypes = pgTable("income_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const expenseTypes = pgTable("expense_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});
