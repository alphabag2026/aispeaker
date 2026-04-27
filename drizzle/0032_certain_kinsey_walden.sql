CREATE TABLE `ai_generations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tool` varchar(50) NOT NULL,
	`inputSummary` text,
	`outputUrl` text,
	`outputType` varchar(20) NOT NULL,
	`creditsUsed` int NOT NULL DEFAULT 0,
	`status` varchar(20) NOT NULL DEFAULT 'completed',
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_generations_id` PRIMARY KEY(`id`)
);
