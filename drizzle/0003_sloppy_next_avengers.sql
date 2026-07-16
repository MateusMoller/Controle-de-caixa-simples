CREATE TABLE `expense_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `expense_types_name_unique` ON `expense_types` (`name`);--> statement-breakpoint
CREATE TABLE `income_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `income_types_name_unique` ON `income_types` (`name`);
--> statement-breakpoint
INSERT INTO `income_types` (`name`) VALUES ('Vendas'), ('Serviços'), ('Comissões'), ('Outros');
--> statement-breakpoint
INSERT INTO `expense_types` (`name`) VALUES ('Fornecedores'), ('Moradia'), ('Transporte'), ('Alimentação'), ('Saúde'), ('Lazer'), ('Impostos'), ('Outros');
