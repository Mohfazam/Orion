import { Router } from "express";
import { getFinding } from "../controllers/findings.controller";

const router: Router = Router();

router.get("/:findingId", getFinding);

export default router;