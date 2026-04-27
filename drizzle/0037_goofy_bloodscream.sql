CREATE TABLE `blockedPresets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`presetType` enum('avatar','subtitle') NOT NULL,
	`presetId` int NOT NULL,
	`blockedBy` int NOT NULL,
	`reason` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `blockedPresets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `presetReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`presetType` enum('avatar','subtitle') NOT NULL,
	`presetId` int NOT NULL,
	`reporterId` int NOT NULL,
	`reason` enum('inappropriate','spam','copyright','offensive','other') NOT NULL,
	`description` text,
	`status` enum('pending','reviewed','blocked','dismissed') NOT NULL DEFAULT 'pending',
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `presetReports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `presetVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`presetType` enum('avatar','subtitle') NOT NULL,
	`presetId` int NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`data` json NOT NULL,
	`changedBy` int NOT NULL,
	`changeNote` varchar(200),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `presetVersions_id` PRIMARY KEY(`id`)
);
