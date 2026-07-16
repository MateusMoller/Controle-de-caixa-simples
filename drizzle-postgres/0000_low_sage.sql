CREATE TABLE "entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"description" text NOT NULL,
	"contact" text DEFAULT '' NOT NULL,
	"category" text NOT NULL,
	"type" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"due_date" text NOT NULL,
	"installment" integer DEFAULT 1 NOT NULL,
	"installments" integer DEFAULT 1 NOT NULL,
	"interest_type" text DEFAULT 'none' NOT NULL,
	"interest_rate_bps" integer DEFAULT 0 NOT NULL,
	"paid" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "expense_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "income_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "income_types_name_unique" UNIQUE("name")
);
