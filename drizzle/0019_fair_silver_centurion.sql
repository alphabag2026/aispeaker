ALTER TABLE `productionPipelines` ADD `introVideoUrl` text;--> statement-breakpoint
ALTER TABLE `productionPipelines` ADD `outroVideoUrl` text;--> statement-breakpoint
ALTER TABLE `productionPipelines` ADD `avatarEngine` varchar(32) DEFAULT 'd-id';