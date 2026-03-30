# Orion — Autonomous Web Quality Intelligence Platform

> *An AI agent that autonomously audits any web application, scores every defect by business risk, and blocks your CI pipeline before bad code ships — in under 60 seconds.*

---

## Table of Contents

1. [Overview](#overview)
2. [Hackathon Scope](#hackathon-scope)
3. [Architecture](#architecture)
4. [LangGraph Agent Pipeline](#langgraph-agent-pipeline)
5. [Database Schema](#database-schema)
6. [Project Structure](#project-structure)
7. [Phase 1 — Build (Baseline MVP)](#phase-1--build-baseline-mvp)
8. [Phase 2 — Improve (Push to 9+)](#phase-2--improve-push-to-9)
9. [Evaluation Criteria Map](#evaluation-criteria-map)
10. [API Reference](#api-reference)
11. [Setup & Running Locally](#setup--running-locally)
12. [Environment Variables](#environment-variables)
13. [Demo Script](#demo-script)

---

## Overview

Orion is an AI-powered, fully autonomous testing and quality analysis platform. Given a URL, Orion:

1. **Discovers** the application — crawls pages, maps routes, identifies components and coverage gaps
2. **Tests Performance** — simulates load, detects bottlenecks, validates scalability
3. **Scores Defects** — prioritizes every finding by severity, confidence, and business impact
4. **Visualizes Results** — produces a real-time quality dashboard with trends, scores, and actionable insights

Orion is built on a **LangGraph multi-agent architecture**, where each capability is an autonomous agent node in a directed graph. Agents run, retry on failure, and hand off results to downstream agents — all without human intervention.

---

## Hackathon Scope

Orion targets the following focus areas from the hackathon problem statement:

| Area | Name | Description |
|------|------|-------------|
| **Area 1** *(Core)* | Autonomous Discovery | Self-learning agents that crawl any web app, uncover defects, and map coverage gaps |
| **Area 3** | Performance Testing | Simulates real-world load, detects bottlenecks, validates resilience |
| **Area 5** | Defect Scoring | Intelligent prioritization by impact, risk, and business criticality |
| **Area 6** | Visualization | Real-time dashboards transforming test data into actionable release decisions |

**Strategy:** Area 1 is the core use case. Areas 5 and 6 are the two additional use cases showcased. Area 3 augments the discovery pipeline with performance signals. This maps directly to the evaluation rubric (1 core + 2 additional) while keeping depth over breadth.

---

## Architecture

```
                        ┌─────────────────────────────────────────────┐
                        │              Orion Platform                  │
                        │                                              │
  GitHub PR / Manual ──►│  API Gateway  ──►  Run Orchestrator          │
                        │                        │                     │
                        │              ┌─────────▼──────────┐          │
                        │              │   LangGraph Engine  │          │
                        │              │                     │          │
                        │              │  [Discovery Agent]  │          │
                        │              │         │           │          │
                        │              │  [Performance Agent]│          │
                        │              │         │           │          │
                        │              │  [Hygiene Agent]    │          │
                        │              │         │           │          │
                        │              │  [Scoring Agent]    │          │
                        │              │         │           │          │
                        │              │  [Viz / Report]     │          │
                        │              └─────────┬──────────┘          │
                        │                        │                     │
                        │              ┌─────────▼──────────┐          │
                        │              │    PostgreSQL DB     │          │
                        │              │  (runs, findings,   │          │
                        │              │   agent_results)    │          │
                        │              └────────────────────┘          │
                        │                                              │
                        │  Dashboard UI  ◄──  WebSocket / REST API     │
                        └─────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Agent Orchestration | LangGraph (Python) |
| LLM | Claude / GPT-4o via Anthropic / OpenAI API |
| Web Crawling | Playwright (headless Chromium) |
| Performance Testing | Lighthouse CI + custom load scripts |
| Database | PostgreSQL + Drizzle ORM |
| Backend API | Node.js / Fastify (TypeScript) |
| Frontend Dashboard | Next.js + shadcn/ui + Recharts |
| Monorepo | Turborepo + pnpm workspaces |
| CI Integration | GitHub App (Webhooks) |

---

## LangGraph Agent Pipeline

The graph is a directed acyclic workflow with conditional retry edges.

```
START
  │
  ▼
[discovery_agent]  ──────────────────────────────────────────┐
  │  Crawls the URL. Maps all pages, routes, and             │
  │  interactive elements. Produces a sitemap graph.         │
  │                                                          │
  ▼                                                          │
[performance_agent]                                          │ retry
  │  Runs Lighthouse on each discovered page.               │ on fail
  │  Extracts Core Web Vitals, load times, asset sizes.     │
  │                                                          │
  ▼                                                          │
[hygiene_agent]  (Area 4 — bonus, not core scope)           │
  │  Checks code quality signals via static analysis.       │
  │  Flags accessibility violations, broken links, SEO.     │
  │                                                          │
  ▼                                                          │
[scoring_agent]  ◄────────────────────────────────────────── ┘
  │  Aggregates all findings from upstream agents.
  │  Applies weighted scoring formula.
  │  Produces pass/fail verdict and overall score.
  │
  ▼
[visualization_agent]
  │  Writes final structured data to DB.
  │  Triggers dashboard refresh via WebSocket.
  │  Generates shareable report URL.
  │
  ▼
END
```

### Agent State Shape

The shared LangGraph state passed between nodes:

```python
class OrionState(TypedDict):
    run_id: str
    url: str
    mode: Literal["manual", "ci"]
    sitemap: list[PageNode]           # populated by discovery_agent
    performance_findings: list[Finding]
    hygiene_findings: list[Finding]
    all_findings: list[Finding]       # merged by scoring_agent
    overall_score: int                # 0–100
    passed: bool
    current_node: str
    error: Optional[str]
```

### Scoring Formula (Area 5)

Each finding is scored using a weighted formula:

```
finding_weight = severity_score × confidence_multiplier × business_impact_zone

severity_score:
  critical = 10
  high     = 7
  medium   = 4
  low      = 2
  info     = 0.5

confidence_multiplier:
  high   = 1.0
  medium = 0.7
  low    = 0.4

business_impact_zone:
  checkout / auth / payment = 2.0   (critical path)
  navigation / core UI      = 1.5
  content / static pages    = 1.0
  admin / internal tools    = 0.8

overall_score = 100 − clamp(sum(finding_weight) / max_weight × 100, 0, 100)
passed = overall_score >= threshold (default: 70)
```

---

## Database Schema

All tables live in `packages/db/src/schema.ts`.

### `runs`
The top-level record for every analysis run.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Internal ID |
| `run_id` | text unique | Human-readable run identifier |
| `mode` | enum | `manual` or `ci` |
| `status` | enum | `queued → running → complete / failed` |
| `current_node` | text | Which LangGraph node is active |
| `state` | jsonb | Full LangGraph state snapshot |
| `url` | text | Target URL being audited |
| `overall_score` | int | Final 0–100 quality score |
| `passed` | bool | Pass/fail verdict |
| `prev_run_id` | text | Links to previous run for diffing |
| `ci_context` | jsonb | PR number, commit SHA, branch, repo |

### `graph_executions`
1:1 with a run — stores the graph topology for visualization.

| Column | Type | Description |
|--------|------|-------------|
| `run_id` | uuid FK → runs | Parent run |
| `nodes` | jsonb | Array of node definitions |
| `edges` | jsonb | Array of directed edges |

### `agent_results`
One record per agent per run. Supports retries via `attempt`.

| Column | Type | Description |
|--------|------|-------------|
| `run_id` | uuid FK → runs | Parent run |
| `agent` | enum | `discovery / hygiene / performance / visualization` |
| `node_id` | text | LangGraph node name |
| `attempt` | int | Retry number (starts at 1) |
| `status` | enum | `running / complete / failed` |
| `score` | int | Agent-level sub-score |
| `data` | jsonb | Raw agent output |
| `logs` | jsonb | Execution logs |

### `findings`
Every defect, issue, or warning surfaced by any agent.

| Column | Type | Description |
|--------|------|-------------|
| `run_id` | uuid FK → runs | Parent run |
| `agent` | text | Which agent found this |
| `severity` | enum | `critical / high / medium / low / info` |
| `confidence` | enum | `high / medium / low` |
| `title` | text | Short issue title |
| `detail` | text | Full description |
| `file` | text | File or URL where found |
| `line` | int | Line number if applicable |
| `fix_suggestion` | text | AI-generated remediation hint |

### `connected_repos`
GitHub App installations for CI integration.

| Column | Type | Description |
|--------|------|-------------|
| `owner` | text | GitHub org or user |
| `repo` | text | Repository name |
| `installation_id` | text | GitHub App installation ID |
| `staging_url` | text | URL to audit on each PR |
| `settings` | jsonb | Thresholds, ignored paths, agent config |

---

## Project Structure

```
orion/
├── apps/
│   ├── web/                        # Next.js dashboard UI
│   │   ├── app/
│   │   │   ├── runs/[runId]/       # Run detail + live agent status
│   │   │   ├── dashboard/          # Trends, scores, history
│   │   │   └── api/                # Next.js route handlers
│   │   └── components/
│   │       ├── RunTimeline.tsx     # Live LangGraph node progress
│   │       ├── FindingsTable.tsx   # Sortable, filterable findings
│   │       ├── ScoreGauge.tsx      # 0–100 score dial
│   │       └── DiffView.tsx        # New findings vs prev run
│   │
│   └── api/                        # Fastify REST API (TypeScript)
│       ├── routes/
│       │   ├── runs.ts             # POST /runs, GET /runs/:id
│       │   ├── webhooks.ts         # GitHub App webhook handler
│       │   └── ws.ts               # WebSocket for live updates
│       └── services/
│           └── runner.ts           # Spawns Python LangGraph process
│
├── packages/
│   ├── db/                         # Drizzle ORM + schema
│   │   └── src/
│   │       ├── schema.ts           # All table definitions
│   │       ├── index.ts            # Re-exports
│   │       └── client.ts           # pg connection
│   │
│   ├── agents/                     # Python LangGraph package
│   │   ├── graph.py                # Graph definition + edges
│   │   ├── state.py                # OrionState TypedDict
│   │   ├── nodes/
│   │   │   ├── discovery.py        # Playwright crawler
│   │   │   ├── performance.py      # Lighthouse runner
│   │   │   ├── hygiene.py          # Static analysis
│   │   │   ├── scoring.py          # Weighted scoring formula
│   │   │   └── visualization.py    # DB writes + WS trigger
│   │   └── tools/
│   │       ├── crawler.py          # Playwright helpers
│   │       └── llm.py              # LLM client wrapper
│   │
│   └── typescript-config/          # Shared tsconfig
│       ├── base.json
│       ├── nextjs.json
│       └── react-library.json
│
├── drizzle/                        # Generated migration files
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

---

## Phase 1 — Build (Baseline MVP)

This is the build checklist to get a working, demo-able product by **March 30th**.

### Step 1 — Database & Schema
- [ ] Run `drizzle-kit generate` to create migrations
- [ ] Run `drizzle-kit migrate` against a local PostgreSQL instance
- [ ] Seed a test run manually to verify schema

### Step 2 — Discovery Agent (Area 1 — Core)
- [ ] Set up Playwright in `packages/agents`
- [ ] Implement `discovery.py` — crawl a URL, extract all links, map page tree
- [ ] Detect basic issues: broken links (4xx/5xx), missing alt text, missing meta tags
- [ ] Write results to `agent_results` and `findings` tables

### Step 3 — Performance Agent (Area 3)
- [ ] Install `lighthouse` CLI
- [ ] Implement `performance.py` — run Lighthouse on each discovered page
- [ ] Extract: FCP, LCP, TBT, CLS, TTI, and page size
- [ ] Create findings for any metric below threshold (e.g. LCP > 2.5s = high severity)

### Step 4 — Scoring Agent (Area 5)
- [ ] Implement `scoring.py` with the weighted formula above
- [ ] Assign business impact zones manually or via URL pattern matching (`/checkout`, `/login`, etc.)
- [ ] Write `overall_score` and `passed` back to the `runs` table

### Step 5 — LangGraph Wiring
- [ ] Define `graph.py` with all four nodes connected in sequence
- [ ] Add conditional retry edges on agent failure (max 2 retries)
- [ ] Add state persistence — checkpoint to DB after each node via `current_node`

### Step 6 — API Layer
- [ ] `POST /runs` — accepts `{ url, mode }`, creates a run record, spawns LangGraph process
- [ ] `GET /runs/:id` — returns run + all agent results + findings
- [ ] WebSocket endpoint — pushes node completion events to connected clients

### Step 7 — Dashboard UI (Area 6)
- [ ] **Run list page** — table of all runs with score, status, URL, timestamp
- [ ] **Run detail page** — live agent pipeline progress (highlight current node)
- [ ] **Findings table** — sortable by severity, filterable by agent
- [ ] **Score gauge** — large 0–100 dial, green/amber/red
- [ ] Basic responsive layout using shadcn/ui

### Step 8 — End-to-End Test
- [ ] Point Orion at a real public URL (e.g. `https://example.com`)
- [ ] Verify full pipeline completes and findings appear in the dashboard
- [ ] Record demo video (max 5 mins)

---

## Phase 2 — Improve (Push to 9+)

These are the features that separate a good submission from a first-prize winner. Build these after Phase 1 is stable.

### 1. GitHub CI Integration *(Highest Impact)*

**Why:** Directly hits "Scalability & Integration" (15%) and "Out-of-Box Thinking" bonus. No other team will have this.

**What to build:**
- Register a GitHub App
- Handle `pull_request` webhook → extract `staging_url` from `connected_repos` → trigger a run with `mode: "ci"` and `ci_context: { pr, sha, branch }`
- Post a PR status check (✅ pass / ❌ fail) with a link to the Orion report

```
Developer pushes code
       │
       ▼
GitHub fires webhook → Orion API → LangGraph run
                                         │
                              ┌──────────▼──────────┐
                              │  Score drops below   │
                              │  threshold (< 70)?   │
                              └──────────┬──────────┘
                                  yes    │    no
                                  │      │
                                  ▼      ▼
                             ❌ Block  ✅ Pass
                             PR merge  PR merge
```

### 2. Run Diff View *(Unique Feature)*

**Why:** Nobody else will build this. It demonstrates product-level thinking beyond the hackathon scope.

**What to build:**
- On each run, query the previous run via `prev_run_id`
- Compute: new findings, resolved findings, score delta
- Show in dashboard: *"3 new critical findings since last run"* with a before/after score comparison

```typescript
// Diff query
const newFindings = currentFindings.filter(
  f => !prevFindings.some(p => p.title === f.title && p.file === f.file)
);
const resolved = prevFindings.filter(
  f => !currentFindings.some(c => c.title === f.title && c.file === f.file)
);
```

### 3. LLM-Powered Fix Suggestions

**Why:** Hits "Innovation & Originality" (25%) directly. Turns findings from labels into actionable developer guidance.

**What to build:**
- After scoring, pass each high/critical finding to an LLM
- Prompt: *"Given this finding: [title + detail + file + line], suggest a concrete fix in under 100 words"*
- Store in `findings.fix_suggestion`
- Display inline in the dashboard next to each finding

### 4. Scoring Formula UI

**Why:** Makes the scoring engine feel like a real product, not a black box.

**What to build:**
- Show the scoring breakdown on the run detail page
- Visualize: which findings contributed most to score deduction
- Bar chart: severity × count × impact zone

### 5. Visual Regression (Bonus)

**Why:** Differentiates Area 6 visualization beyond just charts.

**What to build:**
- Screenshot every discovered page using Playwright
- On re-runs, diff screenshots pixel-by-pixel using `pixelmatch`
- Flag pages with >5% visual change as a finding

### 6. Polish the Demo Moment

**Why:** Judges make decisions emotionally first, rationally second.

**The closing demo should be:**
1. Open a fresh browser tab
2. Type a URL into Orion
3. Watch the live pipeline progress in real time (each node lighting up)
4. Score animates in: **62 / 100 — FAILED**
5. Click into a critical finding → see the LLM fix suggestion
6. Switch to the diff view: *"4 new critical issues introduced in this run"*
7. Show the GitHub PR with the ❌ blocked status check

---

## Evaluation Criteria Map

| Criterion | Weight | How Orion Addresses It |
|-----------|--------|----------------------|
| Innovation & Originality | 25% | LangGraph multi-agent pipeline, run diffing, LLM fix suggestions |
| Technical Feasibility | 25% | Working end-to-end demo, real DB schema, real Playwright crawler |
| Impact & Relevance | 20% | Directly solves ReQon's stated problem: autonomous, no human setup |
| Scalability & Integration | 15% | GitHub App CI integration, `connected_repos` table, modular agents |
| Presentation & Communication | 15% | Live dashboard demo, score gauge, findings table, diff view |
| Out-of-Box Thinking | Bonus | GitHub PR blocking, run-to-run diffing, per-finding LLM fixes |

---

## API Reference

### `POST /runs`
Trigger a new analysis run.

```json
Request:
{
  "url": "https://staging.myapp.com",
  "mode": "manual"
}

Response:
{
  "runId": "run_abc123",
  "status": "queued"
}
```

### `GET /runs/:runId`
Get full run details including all findings.

```json
{
  "runId": "run_abc123",
  "status": "complete",
  "overallScore": 74,
  "passed": true,
  "url": "https://staging.myapp.com",
  "agentResults": [...],
  "findings": [
    {
      "severity": "high",
      "confidence": "high",
      "title": "LCP exceeds 4s on /checkout",
      "detail": "Largest Contentful Paint is 4.2s. Google threshold is 2.5s.",
      "fixSuggestion": "Defer non-critical JS and optimize hero image loading..."
    }
  ]
}
```

### `GET /runs/:runId/diff`
Compare this run against `prev_run_id`.

```json
{
  "scoreDelta": -8,
  "newFindings": [...],
  "resolvedFindings": [...],
  "unchanged": [...]
}
```

### `WebSocket /ws/runs/:runId`
Real-time node progress updates.

```json
{ "event": "node_complete", "node": "discovery_agent", "status": "complete", "score": 88 }
{ "event": "node_start",    "node": "performance_agent" }
{ "event": "run_complete",  "overallScore": 74, "passed": true }
```

---

## Setup & Running Locally

### Prerequisites

- Node.js 20+
- pnpm 9+
- Python 3.11+
- PostgreSQL 15+
- Playwright browsers (`playwright install chromium`)

### Install

```bash
# Clone the repo
git clone https://github.com/your-org/orion
cd orion

# Install Node dependencies
pnpm install

# Install Python dependencies
cd packages/agents
pip install -r requirements.txt
playwright install chromium
cd ../..
```

### Database Setup

```bash
# Copy env file
cp .env.example .env
# Fill in DATABASE_URL in .env

# Generate and run migrations
cd packages/db
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

### Run in Development

```bash
# From repo root — starts all apps in parallel via Turborepo
pnpm dev
```

This starts:
- `apps/api` on `http://localhost:3001`
- `apps/web` on `http://localhost:3000`

### Trigger a Test Run

```bash
curl -X POST http://localhost:3001/runs \
  -H "Content-Type: application/json" \
  -d '{ "url": "https://example.com", "mode": "manual" }'
```

Open `http://localhost:3000` to watch the run in real time.

---

## Environment Variables

```bash
# packages/db/.env
DATABASE_URL=postgresql://user:password@localhost:5432/orion

# apps/api/.env
DATABASE_URL=postgresql://user:password@localhost:5432/orion
PORT=3001

# packages/agents/.env
ANTHROPIC_API_KEY=sk-ant-...       # For LLM fix suggestions
OPENAI_API_KEY=sk-...              # Alternative LLM

# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

---

## Demo Script

Use this as the script for the 5-minute demo video.

**[0:00 – 0:30] Introduction**
> "Orion is an autonomous quality intelligence platform. You give it a URL. It does the rest — no setup, no manual test writing, no human effort. Let me show you."

**[0:30 – 1:30] Trigger a run**
- Open the Orion dashboard
- Type in the staging URL
- Hit "Run Analysis"
- Watch the pipeline light up node by node in real time

**[1:30 – 2:30] The score lands**
- Score animates to final value
- Walk through the findings table — sort by severity
- Click a critical finding — show the LLM fix suggestion

**[2:30 – 3:30] The diff view**
- Switch to diff view
- *"4 new critical issues were introduced in this deployment that weren't there before"*
- Show score delta: previous run was 82, this run is 64

**[3:30 – 4:30] GitHub CI integration**
- Show a GitHub PR with the Orion status check
- ❌ "Quality gate failed — Score: 64/100. 4 critical findings. Merge blocked."
- Click the link — jumps to the Orion report

  # Orion — API Documentation

> Complete API reference for backend and frontend developers. All endpoints are prefixed with `/api/v1` unless otherwise noted. No authentication required for Phase 1.

---

## Table of Contents

1. [Conventions](#conventions)
2. [Tier 1 — Core MVP APIs](#tier-1--core-mvp-apis) *(Build these first)*
   - [Runs](#runs)
   - [Findings](#findings)
   - [Agent Results](#agent-results)
   - [Graph Executions](#graph-executions)
   - [WebSocket](#websocket)
3. [Tier 2 — Enhanced Feature APIs](#tier-2--enhanced-feature-apis) *(Phase 2)*
   - [Run Diff](#run-diff)
   - [Connected Repos](#connected-repos)
   - [GitHub Webhooks](#github-webhooks)
   - [Fix Suggestions](#fix-suggestions)
   - [Scoring Breakdown](#scoring-breakdown)
4. [Tier 3 — Nice to Have APIs](#tier-3--nice-to-have-apis) *(Cream on the cake)*
   - [Dashboard Analytics](#dashboard-analytics)
   - [Visual Regression](#visual-regression)
   - [Health & Status](#health--status)
5. [Shared Types Reference](#shared-types-reference)
6. [Error Codes](#error-codes)

---

## Conventions

### Base URL
```
Development:  http://localhost:3001/api/v1
Production:   https://your-domain.com/api/v1
```

### Request Headers
```
Content-Type: application/json
Accept:       application/json
```

### Standard Response Envelope
All responses follow this shape:

```ts
// Success
{
  "success": true,
  "data": { ... }
}

// Error
{
  "success": false,
  "error": {
    "code": "RUN_NOT_FOUND",
    "message": "No run found with ID run_abc123",
    "statusCode": 404
  }
}
```

### Pagination (where applicable)
```
GET /runs?page=1&limit=20&sortBy=createdAt&order=desc
```

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 87,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## Tier 1 — Core MVP APIs

---

## Runs

The run is the central entity. Everything else hangs off it.

---

### `POST /runs`

Trigger a new analysis run against a URL.

**Used by:** Dashboard "Run Analysis" button, CI webhook handler.

**Request Body**

```ts
{
  url: string           // Required. The URL to audit. Must be a valid http/https URL.
  mode: "manual" | "ci" // Required.
  prevRunId?: string    // Optional. The run_id of a previous run for diff tracking.
  ciContext?: {         // Required when mode = "ci"
    pr: number
    sha: string
    branch: string
    repo: string
    owner: string
  }
}
```

**Example Request**
```json
{
  "url": "https://staging.myapp.com",
  "mode": "manual"
}
```

**Response `201 Created`**
```json
{
  "success": true,
  "data": {
    "runId": "run_k8x92m",
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "queued",
    "url": "https://staging.myapp.com",
    "mode": "manual",
    "createdAt": "2026-03-27T10:30:00.000Z"
  }
}
```

**Errors**

| Code | Status | Meaning |
|------|--------|---------|
| `INVALID_URL` | 400 | URL is not a valid http/https URL |
| `MISSING_CI_CONTEXT` | 400 | `mode` is `ci` but `ciContext` is missing |
| `RUN_IN_PROGRESS` | 409 | A run is already active for this URL |

---

### `GET /runs`

List all runs with pagination and optional filters.

**Used by:** Dashboard run history table, CI status pages.

**Query Parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Results per page (max 100) |
| `status` | string | — | Filter by status: `queued`, `running`, `complete`, `failed` |
| `mode` | string | — | Filter by mode: `manual`, `ci` |
| `url` | string | — | Filter by URL (partial match) |
| `passed` | boolean | — | Filter by pass/fail verdict |
| `sortBy` | string | `createdAt` | Sort field |
| `order` | string | `desc` | `asc` or `desc` |

**Example Request**
```
GET /api/v1/runs?status=complete&limit=10&order=desc
```

**Response `200 OK`**
```json
{
  "success": true,
  "data": [
    {
      "runId": "run_k8x92m",
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "url": "https://staging.myapp.com",
      "status": "complete",
      "mode": "manual",
      "overallScore": 74,
      "passed": true,
      "currentNode": null,
      "durationMs": 48200,
      "createdAt": "2026-03-27T10:30:00.000Z",
      "completedAt": "2026-03-27T10:30:48.000Z",
      "prevRunId": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

### `GET /runs/:runId`

Get full details of a single run including all agent results and findings.

**Used by:** Run detail page, CI status check link.

**Path Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `runId` | string | The `run_id` field (e.g. `run_k8x92m`), not the UUID |

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "runId": "run_k8x92m",
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "url": "https://staging.myapp.com",
    "mode": "manual",
    "status": "complete",
    "currentNode": null,
    "overallScore": 74,
    "passed": true,
    "durationMs": 48200,
    "createdAt": "2026-03-27T10:30:00.000Z",
    "completedAt": "2026-03-27T10:30:48.000Z",
    "prevRunId": "run_j7w81l",
    "ciContext": null,
    "agentResults": [
      {
        "id": "...",
        "agent": "discovery",
        "nodeId": "discovery_agent",
        "attempt": 1,
        "status": "complete",
        "score": 88,
        "startedAt": "2026-03-27T10:30:02.000Z",
        "endedAt": "2026-03-27T10:30:20.000Z",
        "data": {
          "pagesDiscovered": 14,
          "brokenLinks": 2,
          "sitemap": [...]
        },
        "error": null
      }
    ],
    "findings": [
      {
        "id": "...",
        "agent": "performance",
        "nodeId": "performance_agent",
        "severity": "high",
        "confidence": "high",
        "title": "LCP exceeds threshold on /checkout",
        "detail": "Largest Contentful Paint is 4.2s. Google's threshold is 2.5s.",
        "file": "https://staging.myapp.com/checkout",
        "line": null,
        "fixSuggestion": "Defer non-critical JS and optimize the hero image with next/image lazy loading."
      }
    ],
    "graphExecution": {
      "nodes": [...],
      "edges": [...]
    },
    "summary": {
      "totalFindings": 12,
      "bySeverity": {
        "critical": 1,
        "high": 3,
        "medium": 5,
        "low": 2,
        "info": 1
      },
      "byAgent": {
        "discovery": 4,
        "performance": 6,
        "hygiene": 2
      }
    }
  }
}
```

**Errors**

| Code | Status | Meaning |
|------|--------|---------|
| `RUN_NOT_FOUND` | 404 | No run found with the given `runId` |

---

### `GET /runs/:runId/status`

Lightweight polling endpoint. Returns only status and current node.

**Used by:** Frontend polling fallback if WebSocket is unavailable.

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "runId": "run_k8x92m",
    "status": "running",
    "currentNode": "performance_agent",
    "overallScore": null,
    "passed": null,
    "completedAt": null
  }
}
```

---

### `DELETE /runs/:runId`

Cancel a queued or running run.

**Used by:** Dashboard "Cancel" button.

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "runId": "run_k8x92m",
    "status": "failed",
    "message": "Run cancelled by user"
  }
}
```

**Errors**

| Code | Status | Meaning |
|------|--------|---------|
| `RUN_NOT_FOUND` | 404 | No run with this ID |
| `RUN_ALREADY_COMPLETE` | 409 | Can't cancel a completed run |

---

## Findings

---

### `GET /runs/:runId/findings`

Get all findings for a run with filtering and sorting.

**Used by:** Findings table on run detail page.

**Query Parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `severity` | string | — | Filter: `critical`, `high`, `medium`, `low`, `info` |
| `agent` | string | — | Filter: `discovery`, `performance`, `hygiene`, `visualization` |
| `confidence` | string | — | Filter: `high`, `medium`, `low` |
| `sortBy` | string | `severity` | Sort field: `severity`, `confidence`, `agent` |
| `order` | string | `desc` | `asc` or `desc` |
| `page` | number | 1 | Page number |
| `limit` | number | 50 | Results per page |

**Example Request**
```
GET /api/v1/runs/run_k8x92m/findings?severity=critical&severity=high&sortBy=severity
```

**Response `200 OK`**
```json
{
  "success": true,
  "data": [
    {
      "id": "a1b2c3d4-...",
      "agent": "performance",
      "nodeId": "performance_agent",
      "severity": "critical",
      "confidence": "high",
      "title": "Page /checkout has no HTTPS",
      "detail": "The checkout page is served over HTTP. All sensitive pages must use HTTPS.",
      "file": "http://staging.myapp.com/checkout",
      "line": null,
      "fixSuggestion": "Configure your server to redirect all HTTP traffic to HTTPS and set HSTS headers."
    }
  ],
  "pagination": { ... }
}
```

---

### `GET /findings/:findingId`

Get a single finding by its UUID.

**Used by:** Finding detail drawer/modal.

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-...",
    "runId": "550e8400-...",
    "agent": "performance",
    "severity": "high",
    "confidence": "high",
    "title": "LCP exceeds threshold on /checkout",
    "detail": "Largest Contentful Paint is 4.2s...",
    "file": "https://staging.myapp.com/checkout",
    "line": null,
    "fixSuggestion": "Defer non-critical JS..."
  }
}
```

---

## Agent Results

---

### `GET /runs/:runId/agents`

Get all agent execution records for a run.

**Used by:** Live pipeline progress view, agent timeline.

**Response `200 OK`**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "agent": "discovery",
      "nodeId": "discovery_agent",
      "attempt": 1,
      "status": "complete",
      "score": 88,
      "startedAt": "2026-03-27T10:30:02.000Z",
      "endedAt": "2026-03-27T10:30:20.000Z",
      "durationMs": 18000,
      "data": {
        "pagesDiscovered": 14,
        "brokenLinks": 2,
        "missingAltText": 5,
        "sitemap": [
          { "url": "/", "depth": 0, "status": 200 },
          { "url": "/checkout", "depth": 1, "status": 200 }
        ]
      },
      "logs": [
        { "ts": "2026-03-27T10:30:02.100Z", "level": "info", "msg": "Starting crawl of https://staging.myapp.com" },
        { "ts": "2026-03-27T10:30:05.200Z", "level": "info", "msg": "Discovered 14 pages" }
      ],
      "error": null
    },
    {
      "agent": "performance",
      "status": "running",
      "attempt": 1,
      ...
    }
  ]
}
```

---

### `GET /runs/:runId/agents/:agent`

Get results for a specific agent within a run.

**Path Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `runId` | string | The run ID |
| `agent` | string | `discovery`, `performance`, `hygiene`, `visualization` |

**Response** — same shape as a single item from `GET /runs/:runId/agents`.

---

## Graph Executions

---

### `GET /runs/:runId/graph`

Get the LangGraph node/edge topology for a run. Used to render the live pipeline diagram.

**Used by:** Pipeline visualizer component on the run detail page.

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "runId": "550e8400-...",
    "nodes": [
      { "id": "discovery_agent",    "label": "Discovery",    "status": "complete", "score": 88 },
      { "id": "performance_agent",  "label": "Performance",  "status": "running",  "score": null },
      { "id": "hygiene_agent",      "label": "Hygiene",      "status": "queued",   "score": null },
      { "id": "scoring_agent",      "label": "Scoring",      "status": "queued",   "score": null },
      { "id": "visualization_agent","label": "Visualization","status": "queued",   "score": null }
    ],
    "edges": [
      { "from": "discovery_agent",    "to": "performance_agent" },
      { "from": "performance_agent",  "to": "hygiene_agent" },
      { "from": "hygiene_agent",      "to": "scoring_agent" },
      { "from": "scoring_agent",      "to": "visualization_agent" }
    ],
    "currentNode": "performance_agent",
    "createdAt": "2026-03-27T10:30:00.000Z"
  }
}
```

---

## WebSocket

Real-time updates pushed from server to client during an active run.

---

### `WS /ws/runs/:runId`

Connect to receive live events for a specific run.

**Connection URL**
```
ws://localhost:3001/ws/runs/run_k8x92m
```

**Client → Server (heartbeat)**
```json
{ "type": "ping" }
```

**Server → Client Events**

#### `run.started`
Fired when the LangGraph pipeline begins.
```json
{
  "event": "run.started",
  "runId": "run_k8x92m",
  "ts": "2026-03-27T10:30:01.000Z"
}
```

#### `node.started`
Fired when a node begins executing.
```json
{
  "event": "node.started",
  "runId": "run_k8x92m",
  "node": "discovery_agent",
  "attempt": 1,
  "ts": "2026-03-27T10:30:02.000Z"
}
```

#### `node.log`
Fired for each log line emitted by an agent. Used for the live log stream.
```json
{
  "event": "node.log",
  "runId": "run_k8x92m",
  "node": "discovery_agent",
  "level": "info",
  "message": "Discovered 14 pages across depth 3",
  "ts": "2026-03-27T10:30:08.000Z"
}
```

#### `node.complete`
Fired when a node finishes successfully.
```json
{
  "event": "node.complete",
  "runId": "run_k8x92m",
  "node": "discovery_agent",
  "score": 88,
  "findingsCount": 4,
  "durationMs": 18000,
  "ts": "2026-03-27T10:30:20.000Z"
}
```

#### `node.failed`
Fired when a node fails (may retry).
```json
{
  "event": "node.failed",
  "runId": "run_k8x92m",
  "node": "performance_agent",
  "attempt": 1,
  "willRetry": true,
  "error": "Lighthouse timed out after 30s",
  "ts": "2026-03-27T10:30:35.000Z"
}
```

#### `finding.created`
Fired each time an agent writes a new finding. Enables real-time findings feed.
```json
{
  "event": "finding.created",
  "runId": "run_k8x92m",
  "finding": {
    "id": "a1b2c3d4-...",
    "agent": "performance",
    "severity": "high",
    "title": "LCP exceeds threshold on /checkout"
  },
  "ts": "2026-03-27T10:30:25.000Z"
}
```

#### `run.complete`
Fired when the full pipeline finishes.
```json
{
  "event": "run.complete",
  "runId": "run_k8x92m",
  "overallScore": 74,
  "passed": true,
  "durationMs": 48200,
  "totalFindings": 12,
  "ts": "2026-03-27T10:30:48.000Z"
}
```

#### `run.failed`
Fired if the entire run fails unrecoverably.
```json
{
  "event": "run.failed",
  "runId": "run_k8x92m",
  "failedNode": "discovery_agent",
  "error": "Target URL returned 503 on all retry attempts",
  "ts": "2026-03-27T10:30:15.000Z"
}
```

---

## Tier 2 — Enhanced Feature APIs

---

## Run Diff

Compare two runs to surface new, resolved, and unchanged findings.

---

### `GET /runs/:runId/diff`

Compare this run against `prevRunId`. `prevRunId` must be set on the run record, or passed as a query param.

**Used by:** Diff view panel on run detail page. The killer feature.

**Query Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `compareWith` | string | Optional. Override `prevRunId` to compare against any other `runId` |

**Example Request**
```
GET /api/v1/runs/run_k8x92m/diff
GET /api/v1/runs/run_k8x92m/diff?compareWith=run_abc001
```

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "current": {
      "runId": "run_k8x92m",
      "overallScore": 64,
      "passed": false,
      "totalFindings": 16
    },
    "previous": {
      "runId": "run_j7w81l",
      "overallScore": 82,
      "passed": true,
      "totalFindings": 9
    },
    "delta": {
      "scoreDelta": -18,
      "verdict": "regression",
      "newFindingsCount": 8,
      "resolvedFindingsCount": 1,
      "unchangedFindingsCount": 8
    },
    "newFindings": [
      {
        "id": "...",
        "severity": "critical",
        "agent": "performance",
        "title": "FID spike on /login — 800ms",
        "detail": "...",
        "fixSuggestion": "..."
      }
    ],
    "resolvedFindings": [
      {
        "id": "...",
        "severity": "high",
        "title": "Missing meta description on /about"
      }
    ],
    "unchangedFindings": [ ... ]
  }
}
```

**Errors**

| Code | Status | Meaning |
|------|--------|---------|
| `NO_PREVIOUS_RUN` | 404 | `prevRunId` not set and `compareWith` not provided |
| `RUNS_DIFFERENT_URL` | 400 | The two runs target different URLs |

---

## Connected Repos

---

### `GET /repos`

List all connected GitHub repositories.

**Used by:** Settings / integrations page.

**Response `200 OK`**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "owner": "acme-corp",
      "repo": "frontend",
      "installationId": "12345678",
      "stagingUrl": "https://staging.acme.com",
      "settings": {
        "passThreshold": 70,
        "ignorePaths": ["/admin", "/internal"],
        "agents": ["discovery", "performance", "scoring"]
      },
      "createdAt": "2026-03-01T00:00:00.000Z"
    }
  ]
}
```

---

### `POST /repos`

Register a new connected repository (called after GitHub App install).

**Request Body**
```json
{
  "owner": "acme-corp",
  "repo": "frontend",
  "installationId": "12345678",
  "stagingUrl": "https://staging.acme.com",
  "settings": {
    "passThreshold": 70,
    "ignorePaths": ["/admin"],
    "agents": ["discovery", "performance", "scoring"]
  }
}
```

**Response `201 Created`**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "owner": "acme-corp",
    "repo": "frontend",
    "installationId": "12345678",
    "stagingUrl": "https://staging.acme.com",
    "createdAt": "2026-03-27T10:00:00.000Z"
  }
}
```

---

### `PATCH /repos/:repoId`

Update settings for a connected repo (e.g. change pass threshold, update staging URL).

**Request Body** *(all fields optional)*
```json
{
  "stagingUrl": "https://new-staging.acme.com",
  "settings": {
    "passThreshold": 80,
    "ignorePaths": ["/admin", "/health"]
  }
}
```

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "owner": "acme-corp",
    "repo": "frontend",
    "stagingUrl": "https://new-staging.acme.com",
    "settings": { ... }
  }
}
```

---

### `DELETE /repos/:repoId`

Disconnect a repository.

**Response `200 OK`**
```json
{
  "success": true,
  "data": { "message": "Repository disconnected" }
}
```

---

## GitHub Webhooks

---

### `POST /webhooks/github`

Receives GitHub App events. This endpoint is called by GitHub, not your frontend.

**Headers (sent by GitHub)**
```
X-GitHub-Event: pull_request
X-Hub-Signature-256: sha256=...
```

**Handled Events**

#### `pull_request` — actions: `opened`, `synchronize`, `reopened`

GitHub sends this when a PR is created or updated. Orion:
1. Looks up the repo in `connected_repos` by `owner` + `repo`
2. Extracts the `staging_url` from the repo record
3. Triggers a new run with `mode: "ci"` and full `ciContext`
4. Posts a pending GitHub status check immediately

**Payload (from GitHub — summarized)**
```json
{
  "action": "synchronize",
  "pull_request": {
    "number": 42,
    "head": {
      "sha": "abc123def456",
      "ref": "feature/checkout-redesign"
    }
  },
  "repository": {
    "name": "frontend",
    "owner": { "login": "acme-corp" }
  },
  "installation": { "id": 12345678 }
}
```

**Response `202 Accepted`**
```json
{
  "success": true,
  "data": {
    "received": true,
    "runId": "run_ci_k8x92m",
    "message": "Run queued for PR #42"
  }
}
```

#### `installation` — action: `created`

GitHub fires this when someone installs the Orion GitHub App. Orion should save the `installationId` so it can post status checks later.

**Response `200 OK`**
```json
{ "success": true, "data": { "received": true } }
```

---

### `GET /webhooks/github/callback`

OAuth callback URL for the GitHub App install flow. Redirects user to the Orion settings page after successful installation.

**Query Parameters (sent by GitHub)**

| Param | Description |
|-------|-------------|
| `installation_id` | The new installation ID |
| `setup_action` | `install` or `update` |

**Response:** `302 Redirect` → `/settings/repos?installed=true`

---

## Fix Suggestions

Trigger or regenerate LLM-powered fix suggestions for findings.

---

### `POST /findings/:findingId/fix`

Generate (or regenerate) an LLM fix suggestion for a specific finding. Useful if the finding was created before the LLM pass ran, or if you want a fresh suggestion.

**Used by:** "Regenerate Fix" button on a finding card.

**Request Body** *(optional)*
```json
{
  "context": "We use Next.js 14 App Router and Tailwind CSS"
}
```

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "findingId": "a1b2c3d4-...",
    "fixSuggestion": "In your Next.js app, replace the standard <img> tag on line 42 of /checkout/page.tsx with next/image and add priority prop for LCP images. Also move your third-party analytics script to load with strategy='lazyOnload'."
  }
}
```

---

### `POST /runs/:runId/fixes`

Bulk generate fix suggestions for all high and critical findings in a run that don't yet have one.

**Used by:** "Generate All Fixes" button on run detail page.

**Response `202 Accepted`**
```json
{
  "success": true,
  "data": {
    "queued": 7,
    "message": "Generating fix suggestions for 7 findings. Results will stream via WebSocket."
  }
}
```

**WebSocket event fired per fix generated:**
```json
{
  "event": "fix.generated",
  "findingId": "a1b2c3d4-...",
  "fixSuggestion": "..."
}
```

---

## Scoring Breakdown

---

### `GET /runs/:runId/score`

Get the full scoring breakdown — how each finding contributed to the final score.

**Used by:** Score breakdown chart / table on run detail page.

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "overallScore": 74,
    "passed": true,
    "threshold": 70,
    "breakdown": [
      {
        "findingId": "a1b2c3d4-...",
        "title": "LCP exceeds threshold on /checkout",
        "severity": "high",
        "severityScore": 7,
        "confidence": "high",
        "confidenceMultiplier": 1.0,
        "businessImpactZone": "checkout / auth / payment",
        "businessImpactMultiplier": 2.0,
        "totalWeight": 14.0,
        "percentageOfDeduction": 18.5
      }
    ],
    "totals": {
      "rawWeight": 75.6,
      "maxPossibleWeight": 290,
      "deductionPercent": 26,
      "bySeverity": {
        "critical": { "count": 1, "totalWeight": 20.0 },
        "high":     { "count": 3, "totalWeight": 36.0 },
        "medium":   { "count": 5, "totalWeight": 14.0 },
        "low":      { "count": 2, "totalWeight": 4.0 },
        "info":     { "count": 1, "totalWeight": 0.4 }
      }
    }
  }
}
```

---

## Tier 3 — Nice to Have APIs

---

## Dashboard Analytics

Global metrics across all runs — powers the dashboard home page.

---

### `GET /analytics/overview`

Top-level platform health stats.

**Used by:** Dashboard home page cards.

**Query Parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `since` | ISO date | 30 days ago | Start of time range |
| `until` | ISO date | now | End of time range |
| `url` | string | — | Filter to a specific URL |

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "totalRuns": 87,
    "passRate": 0.68,
    "avgScore": 71.4,
    "avgDurationMs": 45200,
    "totalFindings": 1043,
    "criticalFindings": 24,
    "topFailingUrls": [
      { "url": "https://staging.myapp.com/checkout", "failCount": 5, "avgScore": 48 }
    ],
    "trend": [
      { "date": "2026-03-20", "avgScore": 68, "runs": 6 },
      { "date": "2026-03-21", "avgScore": 72, "runs": 9 }
    ]
  }
}
```

---

### `GET /analytics/findings/trends`

Finding counts over time, grouped by severity.

**Used by:** Findings trend chart on dashboard.

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "period": "daily",
    "series": [
      {
        "date": "2026-03-20",
        "critical": 3,
        "high": 8,
        "medium": 14,
        "low": 6,
        "info": 2
      }
    ]
  }
}
```

---

### `GET /analytics/scores/history`

Score trend over time for a specific URL.

**Used by:** Score history line chart on run list page.

**Query Parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Yes | The URL to chart scores for |
| `limit` | number | No | Last N runs (default 20) |

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "url": "https://staging.myapp.com",
    "history": [
      { "runId": "run_abc001", "score": 82, "passed": true,  "createdAt": "2026-03-22T..." },
      { "runId": "run_abc002", "score": 79, "passed": true,  "createdAt": "2026-03-23T..." },
      { "runId": "run_k8x92m", "score": 64, "passed": false, "createdAt": "2026-03-27T..." }
    ]
  }
}
```

---

## Visual Regression

Screenshot diffing between runs.

---

### `GET /runs/:runId/screenshots`

Get all page screenshots captured during this run.

**Response `200 OK`**
```json
{
  "success": true,
  "data": [
    {
      "pageUrl": "https://staging.myapp.com/checkout",
      "screenshotUrl": "/static/screenshots/run_k8x92m/checkout.png",
      "capturedAt": "2026-03-27T10:30:22.000Z",
      "hasDiff": true,
      "diffPercent": 8.4
    }
  ]
}
```

---

### `GET /runs/:runId/screenshots/:pageSlug/diff`

Get the pixel diff image between this run and the previous run for a specific page.

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "pageUrl": "https://staging.myapp.com/checkout",
    "currentScreenshotUrl": "/static/screenshots/run_k8x92m/checkout.png",
    "previousScreenshotUrl": "/static/screenshots/run_j7w81l/checkout.png",
    "diffImageUrl": "/static/diffs/run_k8x92m/checkout_diff.png",
    "diffPercent": 8.4,
    "changedPixels": 21504,
    "totalPixels": 256000,
    "isSignificant": true
  }
}
```

---

## Health & Status

---

### `GET /health`

Basic health check. Used by load balancers and uptime monitors.

**No prefix — this is at root `/health`**

**Response `200 OK`**
```json
{
  "status": "ok",
  "ts": "2026-03-27T10:30:00.000Z",
  "uptime": 86400
}
```

---

### `GET /api/v1/health/deep`

Full system health including DB, Python agent runner, and LangGraph connectivity.

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "api": "ok",
    "database": "ok",
    "agentRunner": "ok",
    "checks": {
      "dbLatencyMs": 3,
      "agentRunnerPing": "ok",
      "activeRuns": 2
    }
  }
}
```

**Response `503 Service Unavailable`** (if any check fails)
```json
{
  "success": false,
  "data": {
    "api": "ok",
    "database": "error",
    "agentRunner": "ok",
    "checks": {
      "dbLatencyMs": null,
      "dbError": "Connection refused"
    }
  }
}
```

---

### `GET /api/v1/runs/active`

Get all currently running or queued runs. Useful for the dashboard live indicator.

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "count": 2,
    "runs": [
      {
        "runId": "run_k8x92m",
        "url": "https://staging.myapp.com",
        "status": "running",
        "currentNode": "performance_agent",
        "startedAt": "2026-03-27T10:30:00.000Z"
      }
    ]
  }
}
```

---

## Shared Types Reference

```ts
// Enums
type RunMode     = "manual" | "ci"
type RunStatus   = "queued" | "running" | "complete" | "failed"
type AgentType   = "discovery" | "hygiene" | "performance" | "visualization"
type AgentStatus = "running" | "complete" | "failed"
type Severity    = "critical" | "high" | "medium" | "low" | "info"
type Confidence  = "high" | "medium" | "low"

// Core objects
type Run = {
  id: string           // UUID
  runId: string        // e.g. "run_k8x92m"
  mode: RunMode
  status: RunStatus
  url: string
  currentNode: string | null
  overallScore: number | null  // 0–100
  passed: boolean | null
  durationMs: number | null
  prevRunId: string | null
  ciContext: CiContext | null
  createdAt: string    // ISO 8601
  completedAt: string | null
}

type CiContext = {
  pr: number
  sha: string
  branch: string
  repo: string
  owner: string
}

type Finding = {
  id: string           // UUID
  runId: string        // UUID FK
  agent: string
  nodeId: string | null
  severity: Severity
  confidence: Confidence
  title: string
  detail: string
  file: string | null
  line: number | null
  fixSuggestion: string | null
}

type AgentResult = {
  id: string
  runId: string
  agent: AgentType
  nodeId: string
  attempt: number
  status: AgentStatus
  score: number | null
  startedAt: string
  endedAt: string | null
  durationMs: number | null
  data: Record<string, any>
  logs: LogEntry[] | null
  error: Record<string, any> | null
}

type LogEntry = {
  ts: string
  level: "debug" | "info" | "warn" | "error"
  msg: string
}

type GraphNode = {
  id: string
  label: string
  status: AgentStatus | "queued"
  score: number | null
}

type GraphEdge = {
  from: string
  to: string
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_URL` | 400 | The provided URL is not valid |
| `MISSING_FIELD` | 400 | A required field is missing from the request body |
| `MISSING_CI_CONTEXT` | 400 | CI run triggered without `ciContext` |
| `RUNS_DIFFERENT_URL` | 400 | Diff requested between runs targeting different URLs |
| `INVALID_WEBHOOK_SIGNATURE` | 401 | GitHub webhook signature verification failed |
| `RUN_NOT_FOUND` | 404 | No run found with the given `runId` |
| `FINDING_NOT_FOUND` | 404 | No finding found with the given ID |
| `REPO_NOT_FOUND` | 404 | No connected repo found with the given ID |
| `NO_PREVIOUS_RUN` | 404 | Diff requested but no previous run is linked |
| `RUN_IN_PROGRESS` | 409 | A run is already active for this URL |
| `RUN_ALREADY_COMPLETE` | 409 | Cannot cancel a completed or failed run |
| `LLM_UNAVAILABLE` | 503 | LLM API is unreachable (fix suggestion failed) |
| `AGENT_RUNNER_UNAVAILABLE` | 503 | Python agent process could not be spawned |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

**[4:30 – 5:00] Close**
> "Orion turns quality from a manual bottleneck into an automated gate. Every PR, every deploy — scored, checked, and blocked if it doesn't meet the bar. That's what truly autonomous testing looks like."

---

*Built for Feuji × T-Hub Hackathon, March 2026.*
