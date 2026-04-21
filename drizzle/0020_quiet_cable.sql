CREATE TABLE `lectureProjects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`currentStep` int NOT NULL DEFAULT 1,
	`status` enum('draft','in_progress','ready','generating','completed','failed') NOT NULL DEFAULT 'draft',
	`avatarPosition` enum('bottom-right','bottom-left','top-right','top-left','none') NOT NULL DEFAULT 'bottom-right',
	`avatarSize` enum('small','medium','large') NOT NULL DEFAULT 'medium',
	`avatarShape` enum('circle','rounded','rectangle') NOT NULL DEFAULT 'circle',
	`avatarOpacity` int NOT NULL DEFAULT 100,
	`finalVideoUrl` text,
	`thumbnailUrl` text,
	`totalDurationSec` int DEFAULT 0,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lectureProjects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectAvatars` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`sampleFaceId` int,
	`customFaceUrl` text,
	`name` varchar(255) NOT NULL,
	`role` enum('instructor','host','guest','narrator') NOT NULL DEFAULT 'instructor',
	`ttsVoiceId` varchar(128) DEFAULT 'Kore',
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `projectAvatars_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectSlides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`imageUrl` text NOT NULL,
	`fileKey` text NOT NULL,
	`slideOrder` int NOT NULL DEFAULT 0,
	`originalFileName` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `projectSlides_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `slideAnnotations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`slideId` int NOT NULL,
	`annotationType` enum('circle','arrow','check','underline','freehand') NOT NULL DEFAULT 'circle',
	`penColor` varchar(7) DEFAULT '#FF0000',
	`penThickness` int DEFAULT 3,
	`pathData` json,
	`showAtSec` int DEFAULT 0,
	`durationSec` int DEFAULT 3,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `slideAnnotations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `slideScripts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`slideId` int NOT NULL,
	`avatarId` int,
	`scriptText` text NOT NULL,
	`estimatedDurationSec` int DEFAULT 30,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `slideScripts_id` PRIMARY KEY(`id`)
);
