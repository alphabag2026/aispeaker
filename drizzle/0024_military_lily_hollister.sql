CREATE TABLE `slideScriptVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`versionNumber` int NOT NULL,
	`sectionsSnapshot` text NOT NULL,
	`sectionCount` int DEFAULT 0,
	`changeDescription` varchar(500),
	`changeType` enum('manual','auto') NOT NULL DEFAULT 'manual',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `slideScriptVersions_id` PRIMARY KEY(`id`)
);
