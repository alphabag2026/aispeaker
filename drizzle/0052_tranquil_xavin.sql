ALTER TABLE `scriptTemplates` ADD `type` varchar(20) DEFAULT 'GENERAL';--> statement-breakpoint
ALTER TABLE `scriptTemplates` ADD `icon` varchar(50);--> statement-breakpoint
ALTER TABLE `scriptTemplates` ADD `themeColor` varchar(20);--> statement-breakpoint
ALTER TABLE `scriptTemplates` ADD `isRecommended` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `scriptTemplates` ADD `personnelConfig` text;--> statement-breakpoint
ALTER TABLE `scriptTemplates` ADD `styleConfig` text;--> statement-breakpoint
ALTER TABLE `scriptTemplates` ADD `insertElements` text;