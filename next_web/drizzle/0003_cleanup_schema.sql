DROP TABLE "accounts" CASCADE;--> statement-breakpoint
DROP TABLE "allowlist_requests" CASCADE;--> statement-breakpoint
DROP TABLE "authenticators" CASCADE;--> statement-breakpoint
DROP TABLE "sessions" CASCADE;--> statement-breakpoint
DROP TABLE "verification_tokens" CASCADE;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "email_verified";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "image";