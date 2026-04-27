CREATE TABLE `presetTagMap` (
	`id` int AUTO_INCREMENT NOT NULL,
	`presetType` enum('avatar','subtitle') NOT NULL,
	`presetId` int NOT NULL,
	`tagId` int NOT NULL,
	CONSTRAINT `presetTagMap_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `presetTags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(50) NOT NULL,
	`category` enum('avatar','subtitle','general') NOT NULL DEFAULT 'general',
	`usageCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `presetTags_id` PRIMARY KEY(`id`),
	CONSTRAINT `presetTags_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `sharedSubtitlePresetLikes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`presetId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sharedSubtitlePresetLikes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sharedSubtitlePresets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`userName` varchar(100) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` varchar(500),
	`fontSize` int NOT NULL DEFAULT 16,
	`fontColor` varchar(20) NOT NULL DEFAULT '#FFFFFF',
	`bgColor` varchar(30) NOT NULL DEFAULT 'rgba(0,0,0,0.7)',
	`position` enum('top','bottom') NOT NULL DEFAULT 'bottom',
	`fontFamily` varchar(50) NOT NULL DEFAULT 'sans-serif',
	`bold` boolean NOT NULL DEFAULT false,
	`italic` boolean NOT NULL DEFAULT false,
	`outline` boolean NOT NULL DEFAULT true,
	`likes` int NOT NULL DEFAULT 0,
	`downloads` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sharedSubtitlePresets_id` PRIMARY KEY(`id`)
);
