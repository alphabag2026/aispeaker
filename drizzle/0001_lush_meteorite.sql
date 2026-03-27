CREATE TABLE `lectureEnrollments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lectureId` int NOT NULL,
	`userId` int NOT NULL,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`lastActiveAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lectureEnrollments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lectureMaterials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lectureId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`fileType` enum('pdf','ppt','image','video','other') NOT NULL DEFAULT 'pdf',
	`fileUrl` text NOT NULL,
	`fileKey` text NOT NULL,
	`pageCount` int DEFAULT 0,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lectureMaterials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lectures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`instructorId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`category` enum('web3','ai','blockchain','defi','nft','metaverse','general') NOT NULL DEFAULT 'web3',
	`aiMode` enum('voice','text','avatar') NOT NULL DEFAULT 'voice',
	`voiceProfileId` int,
	`status` enum('draft','scheduled','live','completed','archived') NOT NULL DEFAULT 'draft',
	`scheduledAt` timestamp,
	`coverImageUrl` text,
	`maxParticipants` int DEFAULT 0,
	`aiContext` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lectures_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `qaMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lectureId` int NOT NULL,
	`userId` int,
	`messageType` enum('question','answer','system') NOT NULL DEFAULT 'question',
	`inputMethod` enum('text','voice') NOT NULL DEFAULT 'text',
	`content` text NOT NULL,
	`audioUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `qaMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `voiceProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`sampleUrl` text,
	`voiceDescription` text,
	`teachingStyle` text,
	`systemPrompt` text,
	`ttsVoiceId` varchar(128) DEFAULT 'alloy',
	`isDefault` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `voiceProfiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `whiteboardSnapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lectureId` int NOT NULL,
	`snapshotData` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `whiteboardSnapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `platformRole` enum('instructor','student') DEFAULT 'student' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `bio` text;--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` text;