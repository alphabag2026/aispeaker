CREATE TABLE `lectureFormatTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`category` enum('personnel','style','insert') NOT NULL,
	`icon` varchar(64),
	`colorTheme` varchar(64) DEFAULT 'blue',
	`personnelConfig` json,
	`styleConfig` json,
	`insertElements` json,
	`defaultScriptTemplate` text,
	`previewImageUrl` text,
	`sortOrder` int DEFAULT 0,
	`isActive` boolean DEFAULT true,
	`isSystem` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lectureFormatTemplates_id` PRIMARY KEY(`id`)
);
