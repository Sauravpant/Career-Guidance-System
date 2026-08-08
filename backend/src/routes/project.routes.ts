import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import {
  getProjects,
  getProjectsByPhase,
  createProject,
  updateProject,
  deleteProject,
} from "../controllers/project.controller";

const router = Router();

router.get("/", authMiddleware, getProjects);
router.get("/phase/:phaseId", authMiddleware, getProjectsByPhase);
router.post("/", authMiddleware, createProject);
router.patch("/:id", authMiddleware, updateProject);
router.delete("/:id", authMiddleware, deleteProject);

export default router;
