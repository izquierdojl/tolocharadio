CREATE TABLE `playback_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`station_id` text NOT NULL,
	`snapshot` text NOT NULL,
	`source` text NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer NOT NULL,
	`duration_ms` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `playback_sessions_user_started` ON `playback_sessions` (`user_id`,`started_at`);--> statement-breakpoint
CREATE TABLE `user_station_stats_hourly` (
	`user_id` integer NOT NULL,
	`station_id` text NOT NULL,
	`bucket` text NOT NULL,
	`total_ms` integer NOT NULL,
	PRIMARY KEY(`user_id`, `station_id`, `bucket`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_station_stats_hourly_user_bucket` ON `user_station_stats_hourly` (`user_id`,`bucket`);