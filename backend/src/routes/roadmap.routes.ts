import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import {
  generateRoadmap,
  getRoadmap,
  getMyRoadmap,
  getUserRoadmaps,
  togglePhaseProgress,
  getPhaseById,
} from "../controllers/roadmap.controller";

const router = Router();
router.post("/generate", authMiddleware, generateRoadmap);
router.get("/my", authMiddleware, getMyRoadmap);
router.get("/all", authMiddleware, getUserRoadmaps);
router.get("/phase/:phaseId", authMiddleware, getPhaseById); // Get single phase details
router.get("/:roadmapId", authMiddleware, getRoadmap);
router.patch("/phase/:phaseId/progress", authMiddleware, togglePhaseProgress);

export default router;
