import { Router } from "express";
import { getHealth } from "../controllers/health.controller";

const router: Router = Router();

router.get("/", getHealth);
router.get("/runs", getHealth);

export default router;