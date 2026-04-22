CREATE TABLE `slideAvatarOverrides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`slideId` int NOT NULL,
	`avatarPosition` enum('bottom-right','bottom-left','top-right','top-left','center-right','center-left','none') NOT NULL DEFAULT 'bottom-right',
	`avatarSizePercent` int NOT NULL DEFAULT 25,
	`offsetX` int DEFAULT 0,
	`offsetY` int DEFAULT 0,
	`avatarShape` enum('circle','rounded','rectangle') NOT NULL DEFAULT 'circle',
	`avatarOpacity` int NOT NULL DEFAULT 100,
	`isHidden` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `slideAvatarOverrides_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `slideInsertContent` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`afterSlideId` int NOT NULL DEFAULT 0,
	`contentType` enum('whiteboard','video','image','design') NOT NULL,
	`title` varchar(255),
	`contentUrl` text,
	`fileKey` text,
	`drawingData` json,
	`backgroundColor` varchar(20) DEFAULT '#ffffff',
	`durationSec` int DEFAULT 5,
	`scriptText` text,
	`avatarId` int,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `slideInsertContent_id` PRIMARY KEY(`id`)
);
