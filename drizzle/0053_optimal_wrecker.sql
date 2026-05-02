ALTER TABLE `projectAvatars` ADD `voiceCloneId` int;--> statement-breakpoint
ALTER TABLE `voiceClones` ADD `matchedVoiceId` varchar(128);--> statement-breakpoint
ALTER TABLE `voiceClones` ADD `voiceAnalysis` text;