CREATE TABLE `creditUsageLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`feature` enum('script_generation','tts_conversion','avatar_video','deepfake_transform','thumbnail_generation','subtitle_generation','voice_modulation','live_broadcast') NOT NULL,
	`creditsUsed` int NOT NULL,
	`balanceBefore` int NOT NULL,
	`balanceAfter` int NOT NULL,
	`resourceId` int,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `creditUsageLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cryptoPayments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`paymentId` int NOT NULL,
	`cryptoCurrency` enum('USDT','USDC','ETH','BTC') NOT NULL,
	`network` enum('ethereum','bsc','polygon','tron','bitcoin') NOT NULL DEFAULT 'ethereum',
	`walletAddress` varchar(255) NOT NULL,
	`cryptoAmount` varchar(64) NOT NULL,
	`usdEquivalent` int NOT NULL,
	`txHash` varchar(512),
	`confirmations` int DEFAULT 0,
	`requiredConfirmations` int DEFAULT 3,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cryptoPayments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`paymentType` enum('subscription','credit_package','one_time') NOT NULL,
	`paymentMethod` enum('stripe','crypto') NOT NULL,
	`amountCents` int NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'usd',
	`status` enum('pending','processing','completed','failed','refunded','expired') NOT NULL DEFAULT 'pending',
	`externalId` varchar(512),
	`planId` int,
	`creditAmount` int,
	`description` text,
	`metadata` json,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
