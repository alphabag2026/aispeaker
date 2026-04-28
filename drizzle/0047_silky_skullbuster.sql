CREATE TABLE `broadcastAnalytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`broadcastId` int NOT NULL,
	`totalViewers` int DEFAULT 0,
	`peakConcurrentViewers` int DEFAULT 0,
	`avgWatchDurationSec` int DEFAULT 0,
	`totalChatMessages` int DEFAULT 0,
	`totalQuestions` int DEFAULT 0,
	`retentionRate` int DEFAULT 0,
	`engagementScore` int DEFAULT 0,
	`viewerTimeline` text,
	`chatTimeline` text,
	`geoDistribution` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `broadcastAnalytics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `broadcastRecordings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`broadcastId` int NOT NULL,
	`status` enum('recording','processing','ready','failed') NOT NULL DEFAULT 'recording',
	`timeline` text,
	`totalDurationSec` int DEFAULT 0,
	`vodUrl` text,
	`thumbnailUrl` text,
	`slideCount` int DEFAULT 0,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `broadcastRecordings_id` PRIMARY KEY(`id`)
);
