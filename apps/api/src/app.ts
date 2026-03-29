import express, { type Express } from "express";
import healthRoutes from "./routes/route";
import runsRoutes from "./routes/runs.routes";
import findingsRoutes from "./routes/findings.routes";
import webhookRoutes from "./routes/webhook.routes";
import repoRoutes from "./routes/repos.routes";
import { connectRepo, repoCallback } from "./controllers/repos.controller";
import cors from "cors";

const app: Express = express();

app.use(express.json());
app.use(cors());

app.use("/health", healthRoutes);
app.use("/api/v1/runs", runsRoutes);
app.use("/api/v1/findings", findingsRoutes);
app.use("/api/v1/webhooks", webhookRoutes);

// ── These must be registered BEFORE the repos router ──
app.get("/api/v1/repos/connect",  connectRepo);
app.get("/api/v1/repos/callback", repoCallback);

app.use("/api/v1/repos", repoRoutes);

export default app;