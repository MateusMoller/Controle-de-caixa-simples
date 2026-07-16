import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const entries = sqliteTable("entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
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
  paid: integer("paid", { mode: "boolean" }).notNull().default(false),
});
