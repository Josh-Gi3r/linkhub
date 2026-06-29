CREATE TABLE `company_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`category` enum('primary','partner','product') NOT NULL DEFAULT 'primary',
	`title` varchar(128) NOT NULL,
	`url` text NOT NULL,
	`description` text,
	`iconType` varchar(32) NOT NULL DEFAULT 'link',
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `company_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `company_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`displayName` varchar(128) NOT NULL,
	`tagline` varchar(256),
	`bio` text,
	`avatarUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `company_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `company_profiles_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `company_team_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`userId` int NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isVisible` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `company_team_members_id` PRIMARY KEY(`id`)
);
