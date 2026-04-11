CREATE TABLE `apiUsageLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`apiType` enum('llm','tts') NOT NULL,
	`model` varchar(128),
	`inputTokens` int DEFAULT 0,
	`outputTokens` int DEFAULT 0,
	`durationMs` int DEFAULT 0,
	`status` enum('success','error') NOT NULL DEFAULT 'success',
	`errorCode` varchar(64),
	`errorMessage` text,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `apiUsageLogs_id` PRIMARY KEY(`id`)
);
