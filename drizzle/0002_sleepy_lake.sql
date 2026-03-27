CREATE TABLE `translations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceType` enum('qa_message','lecture_title','lecture_description') NOT NULL DEFAULT 'qa_message',
	`sourceId` int NOT NULL,
	`sourceLang` varchar(10) NOT NULL DEFAULT 'ko',
	`targetLang` varchar(10) NOT NULL,
	`originalText` text NOT NULL,
	`translatedText` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `translations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vodRecordings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lectureId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`duration` int DEFAULT 0,
	`messageCount` int DEFAULT 0,
	`snapshotCount` int DEFAULT 0,
	`status` enum('processing','ready','failed') NOT NULL DEFAULT 'processing',
	`thumbnailUrl` text,
	`viewCount` int DEFAULT 0,
	`startedAt` timestamp,
	`endedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vodRecordings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vodTimelineEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vodId` int NOT NULL,
	`eventType` enum('qa_question','qa_answer','whiteboard_snapshot','slide_change') NOT NULL DEFAULT 'qa_question',
	`offsetSeconds` int DEFAULT 0,
	`content` text,
	`userId` int,
	`audioUrl` text,
	`avatarVideoUrl` text,
	`slideIndex` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vodTimelineEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `lectures` ADD `autoRecord` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `qaMessages` ADD `avatarVideoUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `preferredLang` varchar(10) DEFAULT 'ko';--> statement-breakpoint
ALTER TABLE `voiceProfiles` ADD `avatarImageUrl` text;--> statement-breakpoint
ALTER TABLE `voiceProfiles` ADD `avatarStyle` varchar(64) DEFAULT 'rectangular';