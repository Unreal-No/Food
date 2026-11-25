CREATE TABLE "coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"code" text NOT NULL,
	"kind" text NOT NULL,
	"value" integer NOT NULL,
	"min_total" integer DEFAULT 0 NOT NULL,
	"max_uses" integer,
	"used" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"phone" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"total_spent" integer DEFAULT 0 NOT NULL,
	"visits" integer DEFAULT 0 NOT NULL,
	"last_visit" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "discount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "coupon_code" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "coupons_shop_code_uq" ON "coupons" USING btree ("shop_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_shop_phone_uq" ON "customers" USING btree ("shop_id","phone");