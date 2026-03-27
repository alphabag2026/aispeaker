CREATE TABLE `aiContextTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` enum('web3','ai','blockchain','defi','nft','metaverse','general') NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`systemPrompt` text NOT NULL,
	`topics` text,
	`difficulty` enum('beginner','intermediate','advanced') NOT NULL DEFAULT 'beginner',
	`isBuiltIn` boolean DEFAULT true,
	`creatorId` int,
	`usageCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `aiContextTemplates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `learningProgress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`lectureId` int NOT NULL,
	`questionsAsked` int DEFAULT 0,
	`answersReceived` int DEFAULT 0,
	`timeSpentSeconds` int DEFAULT 0,
	`lastSlideIndex` int DEFAULT 0,
	`completionPercent` int DEFAULT 0,
	`lastActivityAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `learningProgress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `qaBookmarks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`messageId` int NOT NULL,
	`lectureId` int NOT NULL,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `qaBookmarks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vodWatchHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`vodId` int NOT NULL,
	`watchedSeconds` int DEFAULT 0,
	`totalSeconds` int DEFAULT 0,
	`completionPercent` int DEFAULT 0,
	`watchCount` int DEFAULT 1,
	`lastWatchedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vodWatchHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `voiceProfiles` ADD `didApiKey` text;