CREATE TABLE `voiceCloneApplyLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`voiceCloneId` int NOT NULL,
	`cloneName` varchar(255) NOT NULL,
	`projectId` int NOT NULL,
	`projectTitle` varchar(500) NOT NULL,
	`avatarCount` int NOT NULL DEFAULT 1,
	`avatarNames` text,
	`applyMode` enum('all','selected') NOT NULL DEFAULT 'all',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `voiceCloneApplyLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `userAvatars` ADD `defaultTtsVoiceId` varchar(100);--> statement-breakpoint
ALTER TABLE `userAvatars` ADD `defaultVoiceCloneId` int;--> statement-breakpoint
ALTER TABLE `userAvatars` ADD `defaultRole` enum('instructor','host','guest','narrator') DEFAULT 'instructor';