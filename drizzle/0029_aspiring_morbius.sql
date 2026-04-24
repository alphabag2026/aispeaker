CREATE TABLE `projectWatermarks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`watermarkType` enum('logo','text','both') NOT NULL DEFAULT 'text',
	`logoUrl` text,
	`logoFileKey` text,
	`textContent` varchar(255),
	`fontSize` int DEFAULT 24,
	`fontColor` varchar(20) DEFAULT '#FFFFFF',
	`position` enum('top-left','top-center','top-right','bottom-left','bottom-center','bottom-right') NOT NULL DEFAULT 'bottom-right',
	`opacity` int NOT NULL DEFAULT 70,
	`sizePercent` int NOT NULL DEFAULT 15,
	`marginPx` int NOT NULL DEFAULT 20,
	`isEnabled` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projectWatermarks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `slideLayouts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`slideId` int NOT NULL,
	`layoutType` enum('title_only','title_subtitle','title_body','title_bullets','comparison','image_left','image_right','image_full','quote','chart','diagram','timeline','blank') NOT NULL DEFAULT 'title_body',
	`layoutConfig` json,
	`aiReasoning` text,
	`isApplied` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `slideLayouts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `whiteboardParticipants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`userId` int NOT NULL,
	`displayName` varchar(100),
	`cursorColor` varchar(20) DEFAULT '#FF0000',
	`isOnline` boolean DEFAULT true,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`leftAt` timestamp,
	CONSTRAINT `whiteboardParticipants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `whiteboardSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`insertContentId` int,
	`hostUserId` int NOT NULL,
	`sessionCode` varchar(32) NOT NULL,
	`status` enum('waiting','active','ended') NOT NULL DEFAULT 'waiting',
	`maxParticipants` int NOT NULL DEFAULT 10,
	`currentParticipants` int NOT NULL DEFAULT 0,
	`title` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`endedAt` timestamp,
	CONSTRAINT `whiteboardSessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `whiteboardSessions_sessionCode_unique` UNIQUE(`sessionCode`)
);
