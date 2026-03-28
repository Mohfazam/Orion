import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";

//
// ENUMS
//

export const runModeEnum = pgEnum("run_mode", ["manual", "ci"]);

export const runStatusEnum = pgEnum("run_status", [
  "queued",
  "running",
  "complete",
  "failed",
]);

export const agentEnum = pgEnum("agent_type", [
  "discovery",
  "hygiene",
  "performance",
  "scoring",   
  "visualization",
]);

export const agentStatusEnum = pgEnum("agent_status", [
  "running",
  "complete",
  "failed",
]);

export const severityEnum = pgEnum("severity", [
  "critical",
  "high",
  "medium",
  "low",
  "info",
]);

export const confidenceEnum = pgEnum("confidence", [
  "high",
  "medium",
  "low",
]);

//
// RUNS TABLE
//

export const runs = pgTable("runs", {
  id: uuid("id").primaryKey().defaultRandom(),

  runId: text("run_id").notNull().unique(),

  mode: runModeEnum("mode").notNull(),
  status: runStatusEnum("status").notNull(),

  currentNode: text("current_node"),

  state: jsonb("state").$type<Record<string, any>>(),

  url: text("url").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  durationMs: integer("duration_ms"),

  passed: boolean("passed"),
  overallScore: integer("overall_score"),

  prevRunId: text("prev_run_id"),

  ciContext: jsonb("ci_context"),
});

//
// GRAPH EXECUTION (1:1 with run)
//

export const graphExecutions = pgTable("graph_executions", {
  id: uuid("id").primaryKey().defaultRandom(),

  runId: uuid("run_id")
    .references(() => runs.id, { onDelete: "cascade" })
    .notNull()
    .unique(),

  nodes: jsonb("nodes").notNull(),
  edges: jsonb("edges").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

//
// AGENT RESULTS
//

export const agentResults = pgTable("agent_results", {
  id: uuid("id").primaryKey().defaultRandom(),

  runId: uuid("run_id")
    .references(() => runs.id, { onDelete: "cascade" })
    .notNull(),

  agent: agentEnum("agent").notNull(),

  nodeId: text("node_id").notNull(),

  attempt: integer("attempt").default(1).notNull(),

  status: agentStatusEnum("status").notNull(),

  score: integer("score"),

  startedAt: timestamp("started_at").notNull(),
  endedAt: timestamp("ended_at"),

  logs: jsonb("logs"),

  data: jsonb("data").notNull(),

  error: jsonb("error"),
});

//
// FINDINGS
//

export const findings = pgTable("findings", {
  id: uuid("id").primaryKey().defaultRandom(),

  runId: uuid("run_id")
    .references(() => runs.id, { onDelete: "cascade" })
    .notNull(),

  agent: text("agent").notNull(),

  nodeId: text("node_id"),

  severity: severityEnum("severity").notNull(),

  title: text("title").notNull(),
  detail: text("detail").notNull(),

  file: text("file"),
  line: integer("line"),

  fixSuggestion: text("fix_suggestion"),

  confidence: confidenceEnum("confidence").notNull(),
});

//
// CONNECTED REPOS
//

export const connectedRepos = pgTable("connected_repos", {
  id: uuid("id").primaryKey().defaultRandom(),

  owner: text("owner").notNull(),
  repo: text("repo").notNull(),

  installationId: text("installation_id").notNull(),

  stagingUrl: text("staging_url").notNull(),

  settings: jsonb("settings"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});