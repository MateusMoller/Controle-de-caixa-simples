CREATE TABLE `entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_id` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`type` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`due_date` text NOT NULL,
	`installment` integer DEFAULT 1 NOT NULL,
	`installments` integer DEFAULT 1 NOT NULL,
	`paid` integer DEFAULT false NOT NULL
);
