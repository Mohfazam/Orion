import express, { type Express } from "express";
import healthRoutes from "./routes/route";
import runsRoutes from "./routes/runs.routes";

const app: Express = express();

app.use(express.json());


app.use("/health", healthRoutes);
app.use("/api/v1/runs", runsRoutes);

export default app;