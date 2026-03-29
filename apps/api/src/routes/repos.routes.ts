import { Router } from "express";
import {
  listRepos,
  getRepo,
  createRepo,
  updateRepo,
  deleteRepo,
  connectRepo,
  repoCallback,
} from "../controllers/repos.controller";

const router:Router = Router();

router.get("/connect",    connectRepo);
router.get("/callback",   repoCallback);
router.get("/",           listRepos);
router.get("/:repoId",    getRepo);
router.post("/",          createRepo);
router.patch("/:repoId",  updateRepo);
router.delete("/:repoId", deleteRepo);

export default router;