ALTER TABLE `userAvatars` ADD `isFavorite` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `userAvatars` ADD `lastUsedAt` timestamp;--> statement-breakpoint
ALTER TABLE `userAvatars` ADD `useCount` int DEFAULT 0 NOT NULL;