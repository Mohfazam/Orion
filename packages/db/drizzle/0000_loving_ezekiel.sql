CREATE TYPE "public"."agent_type" AS ENUM('discovery', 'hygiene', 'performance', 'visualization');--> statement-breakpoint
CREATE TYPE "public"."agent_status" AS ENUM('running', 'complete', 'failed');--> statement-breakpoint
CREATE TYPE "public"."confidence" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."run_mode" AS ENUM('manual', 'ci');--> statement-breakpoint
CREATE TYPE "public"."run_status" AS ENUM('queued', 'running', 'complete', 'failed');--> statement-breakpoint
CREATE TYPE "public"."severity" AS ENUM('critical', 'high', 'medium', 'low', 'info');--> statement-breakpoint
CREATE TABLE "agent_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"agent" "agent_type" NOT NULL,
	"node_id" text NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"status" "agent_status" NOT NULL,
	"score" integer,
	"started_at" timestamp NOT NULL,
	"ended_at" timestamp,
	"logs" jsonb,
	"data" jsonb NOT NULL,
	"error" jsonb
);
--> statement-breakpoint
CREATE TABLE "connected_repos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner" text NOT NULL,
	"repo" text NOT NULL,
	"installation_id" text NOT NULL,
	"staging_url" text NOT NULL,
	"settings" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"agent" text NOT NULL,
	"node_id" text,
	"severity" "severity" NOT NULL,
	"title" text NOT NULL,
	"detail" text NOT NULL,
	"file" text,
	"line" integer,
	"fix_suggestion" text,
	"confidence" "confidence" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "graph_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"nodes" jsonb NOT NULL,
	"edges" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "graph_executions_run_id_unique" UNIQUE("run_id")
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"mode" "run_mode" NOT NULL,
	"status" "run_status" NOT NULL,
	"current_node" text,
	"state" jsonb,
	"url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"duration_ms" integer,
	"passed" boolean,
	"overall_score" integer,
	"prev_run_id" text,
	"ci_context" jsonb,
	CONSTRAINT "runs_run_id_unique" UNIQUE("run_id")
);
--> statement-breakpoint
ALTER TABLE "agent_results" ADD CONSTRAINT "agent_results_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "findings" ADD CONSTRAINT "findings_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "graph_executions" ADD CONSTRAINT "graph_executions_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;