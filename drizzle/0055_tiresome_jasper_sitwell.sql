CREATE TABLE `presetLikes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`presetId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `presetLikes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `voiceCloneSamples` (
	`id` int AUTO_INCREMENT NOT NULL,
	`voiceCloneId` int NOT NULL,
	`userId` int NOT NULL,
	`sampleUrl` text NOT NULL,
	`durationSec` int,
	`analysis` text,
	`orderIndex` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `voiceCloneSamples_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `voiceEffectPresets` ADD `userName` varchar(255);--> statement-breakpoint
ALTER TABLE `voiceEffectPresets` ADD `isPublic` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `voiceEffectPresets` ADD `usageCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `voiceEffectPresets` ADD `likes` int DEFAULT 0 NOT NULL;