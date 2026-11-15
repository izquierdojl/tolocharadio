CREATE TABLE `podcast_favorites` (
	`user_id` integer NOT NULL,
	`episode_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	`position` integer,
	PRIMARY KEY(`user_id`, `episode_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`episode_id`) REFERENCES `podcast_episodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `podcast_favorites_user_created` ON `podcast_favorites` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `podcast_queue_items` (
	`user_id` integer NOT NULL,
	`episode_id` integer NOT NULL,
	`position` integer NOT NULL,
	`added_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `episode_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`episode_id`) REFERENCES `podcast_episodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `podcast_queue_items_user_position` ON `podcast_queue_items` (`user_id`,`position`);--> statement-breakpoint
CREATE TABLE `podcast_queue_state` (
	`user_id` integer PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `users` ADD `default_section` text DEFAULT 'radio' NOT NULL;