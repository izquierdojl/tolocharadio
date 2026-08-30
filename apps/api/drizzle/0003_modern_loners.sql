CREATE TABLE `custom_stations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`station_id` text NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`snapshot` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `custom_stations_user_station` ON `custom_stations` (`user_id`,`station_id`);--> statement-breakpoint
CREATE INDEX `custom_stations_user` ON `custom_stations` (`user_id`);