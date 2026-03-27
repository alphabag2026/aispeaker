CREATE TABLE `broadcastChats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`broadcastId` int NOT NULL,
	`userId` int NOT NULL,
	`displayName` varchar(255),
	`message` text NOT NULL,
	`messageType` enum('chat','question','system') NOT NULL DEFAULT 'chat',
	`isPinned` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `broadcastChats_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `broadcastViewers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`broadcastId` int NOT NULL,
	`userId` int NOT NULL,
	`displayName` varchar(255),
	`isActive` boolean DEFAULT true,
	`lastHeartbeat` timestamp NOT NULL DEFAULT (now()),
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`leftAt` timestamp,
	CONSTRAINT `broadcastViewers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contentAnalyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scriptId` int NOT NULL,
	`userId` int NOT NULL,
	`overallScore` int DEFAULT 0,
	`readabilityScore` int DEFAULT 0,
	`difficultyScore` int DEFAULT 0,
	`keywordScore` int DEFAULT 0,
	`structureScore` int DEFAULT 0,
	`engagementScore` int DEFAULT 0,
	`analysisDetail` text,
	`suggestions` text,
	`metrics` text,
	`status` enum('analyzing','completed','failed') NOT NULL DEFAULT 'analyzing',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contentAnalyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `liveBroadcasts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`instructorId` int NOT NULL,
	`scriptId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`roomCode` varchar(32) NOT NULL,
	`status` enum('scheduled','live','paused','ended') NOT NULL DEFAULT 'scheduled',
	`currentSlideIndex` int DEFAULT 0,
	`isAudioPlaying` boolean DEFAULT false,
	`audioPosition` int DEFAULT 0,
	`stateUpdatedAt` timestamp NOT NULL DEFAULT (now()),
	`ttsVoiceId` varchar(128) DEFAULT 'alloy',
	`voiceProfileId` int,
	`scheduledAt` timestamp,
	`startedAt` timestamp,
	`endedAt` timestamp,
	`peakViewers` int DEFAULT 0,
	`currentViewers` int DEFAULT 0,
	`audioUrls` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `liveBroadcasts_id` PRIMARY KEY(`id`),
	CONSTRAINT `liveBroadcasts_roomCode_unique` UNIQUE(`roomCode`)
);
--> statement-breakpoint
CREATE TABLE `scriptVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scriptId` int NOT NULL,
	`userId` int NOT NULL,
	`versionNumber` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`scriptContent` text,
	`sections` text,
	`sectionCount` int DEFAULT 0,
	`estimatedDurationSec` int DEFAULT 0,
	`changeDescription` text,
	`changeType` enum('auto','manual','rollback') NOT NULL DEFAULT 'auto',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scriptVersions_id` PRIMARY KEY(`id`)
);
