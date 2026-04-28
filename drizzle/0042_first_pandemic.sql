CREATE TABLE `interpretationSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`broadcastId` int,
	`pipelineId` int,
	`hostUserId` int NOT NULL,
	`sourceLanguage` varchar(10) NOT NULL DEFAULT 'ko',
	`targetLanguages` text NOT NULL,
	`status` enum('active','paused','ended') NOT NULL DEFAULT 'active',
	`totalSegments` int DEFAULT 0,
	`totalDurationSec` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`endedAt` timestamp,
	CONSTRAINT `interpretationSessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supportedLanguages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(10) NOT NULL,
	`name` varchar(100) NOT NULL,
	`nativeName` varchar(100) NOT NULL,
	`flag` varchar(10) NOT NULL,
	`ttsSupported` boolean DEFAULT true,
	`sttSupported` boolean DEFAULT true,
	`sortOrder` int DEFAULT 0,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supportedLanguages_id` PRIMARY KEY(`id`),
	CONSTRAINT `supportedLanguages_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `translationSegments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`sourceText` text NOT NULL,
	`sourceLanguage` varchar(10) NOT NULL,
	`targetLanguage` varchar(10) NOT NULL,
	`translatedText` text NOT NULL,
	`startTimeSec` int,
	`endTimeSec` int,
	`confidence` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `translationSegments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `creatorProfiles` ADD `stripeConnectAccountId` varchar(255);--> statement-breakpoint
ALTER TABLE `creatorProfiles` ADD `stripeConnectStatus` enum('not_started','pending','active','restricted') DEFAULT 'not_started';