import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import {
  getDashboardData,
  getWeeklyProgressTrack,
  getPhaseProgressTrack,
} from "../controllers/dashboard.controller";

const router = Router();
router.get("/", authMiddleware, getDashboardData);
router.get("/weekly-progress", authMiddleware, getWeeklyProgressTrack);
router.get("/phase-progress", authMiddleware, getPhaseProgressTrack);

export default router;
