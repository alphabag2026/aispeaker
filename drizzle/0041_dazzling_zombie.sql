CREATE TABLE `creatorPayouts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creatorId` int NOT NULL,
	`amountInCents` int NOT NULL,
	`platformFeeInCents` int DEFAULT 0,
	`netPayoutInCents` int NOT NULL,
	`stripeConnectAccountId` varchar(255),
	`stripeTransferId` varchar(255),
	`status` enum('pending','processing','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
	`currency` varchar(10) NOT NULL DEFAULT 'usd',
	`failureReason` text,
	`periodStart` timestamp,
	`periodEnd` timestamp,
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`processedAt` timestamp,
	`completedAt` timestamp,
	CONSTRAINT `creatorPayouts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recommendationCache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('personalized','trending','similar','new_releases') NOT NULL,
	`sourceListingId` int,
	`recommendations` text NOT NULL,
	`algorithmVersion` varchar(50) DEFAULT 'v1',
	`confidenceScore` int DEFAULT 0,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recommendationCache_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userLearningHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`listingId` int NOT NULL,
	`progressPercent` int DEFAULT 0,
	`watchTimeSec` int DEFAULT 0,
	`lastPositionSec` int DEFAULT 0,
	`isCompleted` boolean DEFAULT false,
	`completedAt` timestamp,
	`accessCount` int DEFAULT 1,
	`lastAccessedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `userLearningHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`preferredCategories` text,
	`preferredLanguages` text,
	`preferredDifficulty` enum('beginner','intermediate','advanced','all') DEFAULT 'all',
	`favoriteCreators` text,
	`interests` text,
	`learningGoal` text,
	`weeklyTargetMinutes` int DEFAULT 120,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `userPreferences_id` PRIMARY KEY(`id`)
);
