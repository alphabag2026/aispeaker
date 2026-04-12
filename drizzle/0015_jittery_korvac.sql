CREATE TABLE `faceSwapGallery` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`beforeImageUrl` text NOT NULL,
	`afterImageUrl` text NOT NULL,
	`method` enum('builtin','did','heygen') NOT NULL DEFAULT 'builtin',
	`likesCount` int NOT NULL DEFAULT 0,
	`commentsCount` int NOT NULL DEFAULT 0,
	`isPublic` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `faceSwapGallery_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `galleryComments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`galleryItemId` int NOT NULL,
	`userId` int NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `galleryComments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `galleryLikes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`galleryItemId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `galleryLikes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pipSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`position` enum('bottom-right','bottom-left','top-right','top-left') NOT NULL DEFAULT 'bottom-right',
	`size` enum('small','medium','large') NOT NULL DEFAULT 'medium',
	`opacity` int NOT NULL DEFAULT 100,
	`shape` enum('circle','rounded','rectangle') NOT NULL DEFAULT 'rounded',
	`isDefault` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pipSettings_id` PRIMARY KEY(`id`)
);
