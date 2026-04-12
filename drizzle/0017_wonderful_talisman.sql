ALTER TABLE `pipSettings` MODIFY COLUMN `position` enum('bottom-right','bottom-left','top-right','top-left','custom') NOT NULL DEFAULT 'bottom-right';--> statement-breakpoint
ALTER TABLE `pipSettings` ADD `customX` int DEFAULT 75;--> statement-breakpoint
ALTER TABLE `pipSettings` ADD `customY` int DEFAULT 75;