CREATE TABLE `podcast_episodes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`podcast_id` integer NOT NULL,
	`guid` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`audio_url` text NOT NULL,
	`published_at` integer,
	`duration_sec` integer,
	`image_url` text,
	`episode_number` integer,
	`season_number` integer,
	`explicit` integer DEFAULT 0 NOT NULL,
	`last_seen_at` integer,
	`removed_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`podcast_id`) REFERENCES `podcasts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `podcast_episodes_podcast_guid` ON `podcast_episodes` (`podcast_id`,`guid`);--> statement-breakpoint
CREATE INDEX `podcast_episodes_podcast_published` ON `podcast_episodes` (`podcast_id`,`published_at`);--> statement-breakpoint
CREATE TABLE `podcast_subscriptions` (
	`user_id` integer NOT NULL,
	`podcast_id` integer NOT NULL,
	`subscribed_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `podcast_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`podcast_id`) REFERENCES `podcasts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `podcast_subscriptions_user` ON `podcast_subscriptions` (`user_id`);--> statement-breakpoint
CREATE INDEX `podcast_subscriptions_podcast` ON `podcast_subscriptions` (`podcast_id`);--> statement-breakpoint
CREATE TABLE `podcasts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`feed_url` text NOT NULL,
	`title` text NOT NULL,
	`author` text,
	`description` text,
	`image_url` text,
	`language` text,
	`link` text,
	`categories` text DEFAULT '[]' NOT NULL,
	`last_fetched_at` integer,
	`etag` text,
	`last_modified` text,
	`last_error` text,
	`error_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `podcasts_feed_url_unique` ON `podcasts` (`feed_url`);