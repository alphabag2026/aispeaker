CREATE TABLE `scriptImprovementHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectId` int NOT NULL,
	`sectionId` varchar(100) NOT NULL,
	`sectionIndex` int DEFAULT 0,
	`originalText` text NOT NULL,
	`improvedText` text NOT NULL,
	`style` enum('formal','casual','educational','storytelling') NOT NULL DEFAULT 'educational',
	`applied` boolean DEFAULT false,
	`isBatch` boolean DEFAULT false,
	`batchId` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scriptImprovementHistory_id` PRIMARY KEY(`id`)
);
