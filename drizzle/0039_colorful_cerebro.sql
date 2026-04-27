ALTER TABLE `lectureProjects` ADD `interpreterEnabled` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `lectureProjects` ADD `interpreterLanguage` varchar(10);--> statement-breakpoint
ALTER TABLE `lectureProjects` ADD `interpreterVoiceId` varchar(128);--> statement-breakpoint
ALTER TABLE `slideScripts` ADD `interpreterText` text;