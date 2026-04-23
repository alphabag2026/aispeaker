CREATE TABLE `slideTransitions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`slideId` int NOT NULL,
	`transitionType` enum('none','fade','slide_left','slide_right','slide_up','zoom_in','zoom_out','wipe_left','wipe_right','dissolve') NOT NULL DEFAULT 'none',
	`durationMs` int NOT NULL DEFAULT 500,
	`easing` enum('linear','ease_in','ease_out','ease_in_out') NOT NULL DEFAULT 'ease_in_out',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `slideTransitions_id` PRIMARY KEY(`id`)
);
