CREATE TABLE `pronunciationGuides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectId` int NOT NULL,
	`word` varchar(500) NOT NULL,
	`phonetic` varchar(500) NOT NULL,
	`language` varchar(10) DEFAULT 'ko',
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pronunciationGuides_id` PRIMARY KEY(`id`)
);
