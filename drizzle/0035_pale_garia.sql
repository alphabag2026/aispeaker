CREATE TABLE `sharedPresetLikes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`presetId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sharedPresetLikes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sharedPresets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`userName` varchar(100) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` varchar(500),
	`position` enum('bottom-right','bottom-left','top-right','top-left','custom') NOT NULL DEFAULT 'custom',
	`size` enum('small','medium','large') NOT NULL DEFAULT 'medium',
	`opacity` int NOT NULL DEFAULT 100,
	`shape` enum('circle','rounded','rectangle') NOT NULL DEFAULT 'rounded',
	`customX` int DEFAULT 75,
	`customY` int DEFAULT 75,
	`customWidth` int DEFAULT 25,
	`customHeight` int DEFAULT 25,
	`likes` int NOT NULL DEFAULT 0,
	`downloads` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sharedPresets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subtitleStyles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fontSize` int NOT NULL DEFAULT 16,
	`fontColor` varchar(20) NOT NULL DEFAULT '#FFFFFF',
	`bgColor` varchar(20) NOT NULL DEFAULT 'rgba(0,0,0,0.7)',
	`position` enum('top','bottom','custom') NOT NULL DEFAULT 'bottom',
	`customY` int DEFAULT 90,
	`fontFamily` varchar(50) NOT NULL DEFAULT 'sans-serif',
	`bold` boolean NOT NULL DEFAULT false,
	`italic` boolean NOT NULL DEFAULT false,
	`outline` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subtitleStyles_id` PRIMARY KEY(`id`)
);
