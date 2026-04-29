CREATE TABLE `userAvatars` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`imageUrl` text NOT NULL,
	`fileKey` text,
	`type` enum('photo','ai','custom') NOT NULL DEFAULT 'photo',
	`description` text,
	`isDefault` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userAvatars_id` PRIMARY KEY(`id`)
);
