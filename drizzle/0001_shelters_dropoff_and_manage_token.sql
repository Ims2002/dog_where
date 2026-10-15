ALTER TABLE "shelters" ALTER COLUMN "accepts_drop_off" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "shelters" ALTER COLUMN "accepts_drop_off" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "manage_token_hash" text NOT NULL;--> statement-breakpoint
ALTER TABLE "shelters" ADD COLUMN "drop_off_notes" text;