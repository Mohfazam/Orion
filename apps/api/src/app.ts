import express, { type Express } from "express";
import healthRoutes from "./routes/route";
import runsRoutes from "./routes/runs.routes";
import findingsRoutes from "./routes/findings.routes";
import webhookRoutes from "./routes/webhook.routes";
import cors from "cors"

const app: Express = express();

app.use(express.json());
app.use(cors());


app.use("/health", healthRoutes);
app.use("/api/v1/runs", runsRoutes);
app.use("/api/v1/findings",  findingsRoutes);
app.use("/api/v1/webhooks", webhookRoutes);

export default app;