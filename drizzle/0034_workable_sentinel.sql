CREATE TABLE `pipPresets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`position` enum('bottom-right','bottom-left','top-right','top-left','custom') NOT NULL DEFAULT 'custom',
	`size` enum('small','medium','large') NOT NULL DEFAULT 'medium',
	`opacity` int NOT NULL DEFAULT 100,
	`shape` enum('circle','rounded','rectangle') NOT NULL DEFAULT 'rounded',
	`customX` int DEFAULT 75,
	`customY` int DEFAULT 75,
	`customWidth` int DEFAULT 25,
	`customHeight` int DEFAULT 25,
	`isBuiltIn` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pipPresets_id` PRIMARY KEY(`id`)
);
