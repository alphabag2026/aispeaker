CREATE TABLE `voiceEffectPresets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`voiceId` varchar(128) NOT NULL,
	`speed` float NOT NULL DEFAULT 1,
	`pitch` float NOT NULL DEFAULT 0,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `voiceEffectPresets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `projectAvatars` ADD `voiceSpeed` float DEFAULT 1;--> statement-breakpoint
ALTER TABLE `projectAvatars` ADD `voicePitch` float DEFAULT 0;