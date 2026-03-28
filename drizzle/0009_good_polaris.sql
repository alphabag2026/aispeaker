CREATE TABLE `creditTransactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('usage','purchase','refund','bonus','monthly_reset') NOT NULL,
	`amount` int NOT NULL,
	`balanceAfter` int NOT NULL,
	`description` text,
	`resourceType` varchar(64),
	`resourceId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `creditTransactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sampleFaces` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` varchar(64) NOT NULL,
	`gender` varchar(20) NOT NULL,
	`ethnicity` varchar(64),
	`ageRange` varchar(20),
	`imageUrl` text NOT NULL,
	`thumbnailUrl` text,
	`description` text,
	`tags` json,
	`languages` json,
	`isPremium` boolean DEFAULT false,
	`sortOrder` int DEFAULT 0,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sampleFaces_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sampleVoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`language` varchar(10) NOT NULL,
	`gender` varchar(20) NOT NULL,
	`tone` varchar(64) NOT NULL,
	`ttsVoiceId` varchar(128) NOT NULL,
	`sampleAudioUrl` text,
	`description` text,
	`speed` varchar(10) DEFAULT '1.0',
	`pitch` varchar(10) DEFAULT '0',
	`isPremium` boolean DEFAULT false,
	`sortOrder` int DEFAULT 0,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sampleVoices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptionPlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(64) NOT NULL,
	`slug` varchar(32) NOT NULL,
	`priceMonthly` int NOT NULL DEFAULT 0,
	`priceYearly` int DEFAULT 0,
	`monthlyCredits` int NOT NULL DEFAULT 0,
	`maxLecturesPerMonth` int DEFAULT 3,
	`maxVideoQuality` varchar(10) DEFAULT '720p',
	`facePresetLimit` int DEFAULT 3,
	`voicePresetLimit` int DEFAULT 5,
	`hasDeepfake` boolean DEFAULT false,
	`hasVoiceMod` boolean DEFAULT false,
	`hasPlatformIntegration` boolean DEFAULT false,
	`hasLiveBroadcast` boolean DEFAULT false,
	`hasPrioritySupport` boolean DEFAULT false,
	`hasCustomModel` boolean DEFAULT false,
	`hasWhiteLabel` boolean DEFAULT false,
	`description` text,
	`features` json,
	`sortOrder` int DEFAULT 0,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptionPlans_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscriptionPlans_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `userSubscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`planId` int NOT NULL,
	`status` enum('active','cancelled','expired','trial') NOT NULL DEFAULT 'active',
	`billingCycle` enum('monthly','yearly') NOT NULL DEFAULT 'monthly',
	`currentPeriodStart` timestamp NOT NULL DEFAULT (now()),
	`currentPeriodEnd` timestamp NOT NULL,
	`creditsRemaining` int DEFAULT 0,
	`lecturesUsedThisPeriod` int DEFAULT 0,
	`externalPaymentId` varchar(255),
	`cancelAtPeriodEnd` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userSubscriptions_id` PRIMARY KEY(`id`)
);
