CREATE TYPE "public"."custody_status" AS ENUM('with_finder', 'at_shelter', 'not_caught');--> statement-breakpoint
CREATE TYPE "public"."post_status" AS ENUM('active', 'reunited', 'archived');--> statement-breakpoint
CREATE TYPE "public"."report_reason" AS ENUM('spam', 'inappropriate', 'wrong_info', 'other');--> statement-breakpoint
CREATE TYPE "public"."shelter_kind" AS ENUM('pound', 'shelter', 'vet');--> statement-breakpoint
CREATE TYPE "public"."shelter_status" AS ENUM('pending', 'approved', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."species" AS ENUM('dog', 'cat', 'other');--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"species" "species" NOT NULL,
	"status" "post_status" DEFAULT 'active' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"photo_url" text NOT NULL,
	"photo_pathname" text NOT NULL,
	"has_tag" boolean DEFAULT false NOT NULL,
	"tag_text" text,
	"tag_phone" text,
	"found_lat" double precision NOT NULL,
	"found_lng" double precision NOT NULL,
	"locality" text NOT NULL,
	"seen_at" timestamp with time zone NOT NULL,
	"custody" "custody_status" NOT NULL,
	"shelter_id" uuid,
	"custody_lat" double precision,
	"custody_lng" double precision,
	"finder_name" text NOT NULL,
	"finder_contact" text NOT NULL,
	"author_id" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "posts_custody_shelter_chk" CHECK (("posts"."custody" = 'at_shelter') = ("posts"."shelter_id" IS NOT NULL)),
	CONSTRAINT "posts_custody_location_chk" CHECK (("posts"."custody_lat" IS NULL AND "posts"."custody_lng" IS NULL) OR ("posts"."custody" = 'with_finder' AND "posts"."custody_lat" IS NOT NULL AND "posts"."custody_lng" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"reason" "report_reason" NOT NULL,
	"details" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shelters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "shelter_kind" NOT NULL,
	"status" "shelter_status" DEFAULT 'pending' NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"locality" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"phone" text,
	"email" text,
	"website" text,
	"opening_hours" text,
	"accepts_drop_off" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sightings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"seen_at" timestamp with time zone NOT NULL,
	"note" text,
	"photo_url" text,
	"photo_pathname" text,
	"reporter_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_shelter_id_shelters_id_fk" FOREIGN KEY ("shelter_id") REFERENCES "public"."shelters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sightings" ADD CONSTRAINT "sightings_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "posts_status_created_idx" ON "posts" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "posts_found_lat_lng_idx" ON "posts" USING btree ("found_lat","found_lng");--> statement-breakpoint
CREATE INDEX "posts_shelter_idx" ON "posts" USING btree ("shelter_id");--> statement-breakpoint
CREATE INDEX "shelters_status_idx" ON "shelters" USING btree ("status");--> statement-breakpoint
CREATE INDEX "shelters_lat_lng_idx" ON "shelters" USING btree ("lat","lng");--> statement-breakpoint
CREATE INDEX "sightings_post_seen_idx" ON "sightings" USING btree ("post_id","seen_at");