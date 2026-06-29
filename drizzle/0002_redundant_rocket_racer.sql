ALTER TABLE `link_collections` MODIFY COLUMN `isDefault` boolean NOT NULL DEFAULT true;--> statement-breakpoint
ALTER TABLE `analytics_events` ADD `ip` varchar(64);--> statement-breakpoint
ALTER TABLE `analytics_events` ADD `country` varchar(64);--> statement-breakpoint
ALTER TABLE `analytics_events` ADD `city` varchar(128);--> statement-breakpoint
ALTER TABLE `links` ADD `iconType` varchar(32) DEFAULT 'link' NOT NULL;--> statement-breakpoint
ALTER TABLE `links` ADD `presetId` varchar(64);--> statement-breakpoint
ALTER TABLE `profiles` ADD `jobTitle` varchar(128);--> statement-breakpoint
ALTER TABLE `links` DROP COLUMN `iconUrl`;