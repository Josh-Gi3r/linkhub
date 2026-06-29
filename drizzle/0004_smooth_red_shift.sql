CREATE TABLE `user_email_aliases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`isPrimary` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_email_aliases_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_email_aliases_email_unique` UNIQUE(`email`)
);
