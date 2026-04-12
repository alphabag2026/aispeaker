CREATE TABLE `pptUploads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`originalFileUrl` text NOT NULL,
	`originalFileName` varchar(255) NOT NULL,
	`totalSlides` int NOT NULL DEFAULT 0,
	`slideImages` json DEFAULT ('[]'),
	`status` enum('uploading','processing','ready','error') NOT NULL DEFAULT 'uploading',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pptUploads_id` PRIMARY KEY(`id`)
);
