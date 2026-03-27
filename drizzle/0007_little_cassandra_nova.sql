CREATE TABLE `scriptTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`name` varchar(255) NOT NULL,
	`description` text,
	`category` enum('web3','ai','blockchain','defi','nft','metaverse','general') NOT NULL DEFAULT 'general',
	`difficulty` enum('beginner','intermediate','advanced') NOT NULL DEFAULT 'beginner',
	`structure` text NOT NULL,
	`sectionCount` int DEFAULT 0,
	`targetDurationMin` int DEFAULT 10,
	`isBuiltIn` boolean DEFAULT false,
	`tags` text,
	`usageCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scriptTemplates_id` PRIMARY KEY(`id`)
);
