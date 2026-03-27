CREATE TABLE `certificates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`lectureId` int NOT NULL,
	`certificateCode` varchar(64) NOT NULL,
	`studentName` varchar(255) NOT NULL,
	`lectureTitle` varchar(500) NOT NULL,
	`instructorName` varchar(255),
	`completionPercent` int DEFAULT 100,
	`pdfUrl` text,
	`templateName` varchar(128) DEFAULT 'default',
	`issuedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `certificates_id` PRIMARY KEY(`id`),
	CONSTRAINT `certificates_certificateCode_unique` UNIQUE(`certificateCode`)
);
--> statement-breakpoint
CREATE TABLE `faceSwapProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`sourceFaceUrl` text,
	`targetFaceUrl` text,
	`method` enum('did','heygen','builtin') NOT NULL DEFAULT 'builtin',
	`settings` text,
	`previewUrl` text,
	`isDefault` boolean DEFAULT false,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `faceSwapProfiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lectureSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lectureId` int NOT NULL,
	`instructorId` int NOT NULL,
	`status` enum('preparing','live','paused','ended') NOT NULL DEFAULT 'preparing',
	`faceSwapProfileId` int,
	`voiceModProfileId` int,
	`platformIntegrationId` int,
	`externalMeetingUrl` text,
	`webrtcRoomId` varchar(128),
	`startedAt` timestamp,
	`endedAt` timestamp,
	`durationSeconds` int DEFAULT 0,
	`viewerCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lectureSessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `platformIntegrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`platform` enum('zoom','google_meet','webex','tencent','obs') NOT NULL,
	`name` varchar(255) NOT NULL,
	`apiKey` text,
	`apiSecret` text,
	`meetingUrl` text,
	`config` text,
	`isActive` boolean DEFAULT true,
	`lastTestedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platformIntegrations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `voiceModProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`pitchShift` int DEFAULT 0,
	`speedPercent` int DEFAULT 100,
	`toneWarmth` int DEFAULT 0,
	`speakingStyle` enum('formal','casual','academic','friendly','authoritative') NOT NULL DEFAULT 'formal',
	`voiceCharacter` enum('male_deep','male_bright','female_warm','female_clear','neutral') NOT NULL DEFAULT 'neutral',
	`customTtsVoiceId` varchar(128),
	`stylePrompt` text,
	`previewAudioUrl` text,
	`isDefault` boolean DEFAULT false,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `voiceModProfiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `lectures` ADD `faceSwapProfileId` int;--> statement-breakpoint
ALTER TABLE `lectures` ADD `voiceModProfileId` int;