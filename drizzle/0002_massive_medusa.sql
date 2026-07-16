ALTER TABLE `entries` ADD `interest_type` text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `entries` ADD `interest_rate_bps` integer DEFAULT 0 NOT NULL;