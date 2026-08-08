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
router.get("/my", authMiddleware, getMyRoadmap);          // Get user's current (latest) roadmap
router.get("/all", authMiddleware, getUserRoadmaps);      // Get all roadmaps list
router.get("/phase/:phaseId", authMiddleware, getPhaseById);  // Get single phase details
router.get("/:roadmapId", authMiddleware, getRoadmap);   // Get specific roadmap by ID
router.patch("/phase/:phaseId/progress", authMiddleware, togglePhaseProgress); // Toggle phase completion

export default router;