import { Router } from "express";
import {
  createRun,
  listRuns,
  getRun,
  getRunStatus,
  getActiveRuns,
  cancelRun,
} from "../controllers/runs.controller";

const router: Router = Router();

router.get("/active", getActiveRuns);   // must be before /:runId
router.get("/", listRuns);
router.post("/", createRun);
router.get("/:runId", getRun);
router.get("/:runId/status", getRunStatus);
router.delete("/:runId", cancelRun);

export default router;