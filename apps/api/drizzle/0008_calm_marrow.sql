CREATE TABLE `podcast_listen_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`episode_id` integer NOT NULL,
	`podcast_id` integer NOT NULL,
	`client_session_id` text NOT NULL,
	`source` text NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer NOT NULL,
	`listened_ms` integer NOT NULL,
	`last_position_sec` integer,
	`duration_sec` integer,
	`completed` integer DEFAULT 0 NOT NULL,
	`completed_at` integer,
	`last_sequence` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`episode_id`) REFERENCES `podcast_episodes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`podcast_id`) REFERENCES `podcasts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `podcast_listen_sessions_user_client_session` ON `podcast_listen_sessions` (`user_id`,`client_session_id`);--> statement-breakpoint
CREATE INDEX `podcast_listen_sessions_user_started` ON `podcast_listen_sessions` (`user_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `podcast_listen_sessions_user_podcast` ON `podcast_listen_sessions` (`user_id`,`podcast_id`);--> statement-breakpoint
CREATE INDEX `podcast_listen_sessions_user_episode` ON `podcast_listen_sessions` (`user_id`,`episode_id`);--> statement-breakpoint
CREATE TABLE `podcast_progress` (
	`user_id` integer NOT NULL,
	`episode_id` integer NOT NULL,
	`position_sec` integer NOT NULL,
	`duration_sec` integer,
	`completed_at` integer,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `episode_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`episode_id`) REFERENCES `podcast_episodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `podcast_progress_user_updated` ON `podcast_progress` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `user_podcast_stats_hourly` (
	`user_id` integer NOT NULL,
	`podcast_id` integer NOT NULL,
	`episode_id` integer NOT NULL,
	`bucket` text NOT NULL,
	`total_ms` integer NOT NULL,
	PRIMARY KEY(`user_id`, `episode_id`, `bucket`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`podcast_id`) REFERENCES `podcasts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`episode_id`) REFERENCES `podcast_episodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_podcast_stats_hourly_user_podcast_bucket` ON `user_podcast_stats_hourly` (`user_id`,`podcast_id`,`bucket`);