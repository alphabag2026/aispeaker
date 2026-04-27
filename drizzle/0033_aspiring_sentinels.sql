ALTER TABLE `lectureScripts` ADD `interpreterEnabled` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `lectureScripts` ADD `interpreterLanguage` varchar(10);--> statement-breakpoint
ALTER TABLE `lectureScripts` ADD `interpreterSections` text;--> statement-breakpoint
ALTER TABLE `lectureScripts` ADD `interpreterVoiceId` varchar(128);