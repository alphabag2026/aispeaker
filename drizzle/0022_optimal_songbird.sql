CREATE TABLE `video_generations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`status` enum('pending','generating','completed','failed') NOT NULL DEFAULT 'pending',
	`videoUrl` text,
	`totalDuration` int,
	`config` json,
	`errorMessage` text,
	`slideCount` int DEFAULT 0,
	`resolution` varchar(10) DEFAULT '1080p',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `video_generations_id` PRIMARY KEY(`id`)
);
