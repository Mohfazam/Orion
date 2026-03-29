import { Router } from "express";
import {
  createRun, listRuns, getRun,
  getRunStatus, getActiveRuns, cancelRun,
} from "../controllers/runs.controller";
import { getRunFindings }         from "../controllers/findings.controller";
import { getRunAgents, getRunAgent } from "../controllers/agents.controller";
import { getRunGraph }            from "../controllers/graph.controller";
import { getRunDiff }             from "../controllers/diff.controller";

const router: Router = Router();

router.get("/active",                  getActiveRuns);
router.get("/",                        listRuns);
router.post("/",                       createRun);
router.get("/:runId",                  getRun);
router.get("/:runId/status",           getRunStatus);
router.get("/:runId/findings",         getRunFindings);
router.get("/:runId/agents",           getRunAgents);
router.get("/:runId/agents/:agent",    getRunAgent);
router.get("/:runId/graph",            getRunGraph);
router.get("/:runId/diff",             getRunDiff);
router.delete("/:runId",               cancelRun);

export default router;