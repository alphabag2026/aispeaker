CREATE TABLE `voiceClones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`sampleUrl` text NOT NULL,
	`sampleDurationSec` int,
	`language` varchar(10) DEFAULT 'ko',
	`status` enum('uploading','processing','ready','failed') NOT NULL DEFAULT 'uploading',
	`cloneVoiceId` varchar(255),
	`errorMessage` text,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `voiceClones_id` PRIMARY KEY(`id`)
);
