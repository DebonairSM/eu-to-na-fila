ALTER TABLE barbers ADD `avatar_url` text;--> statement-breakpoint
ALTER TABLE barbers ADD `is_present` integer DEFAULT true NOT NULL;