import express, { type Express } from "express";
import healthRoutes from "./routes/route";

const app: Express = express();

app.use(express.json());


app.use("/health", healthRoutes);

export default app;