import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import {
  getDashboardData,
  getWeeklyProgressTrack,
  getPhaseProgressTrack,
} from "../controllers/dashboard.controller";

const router = Router();

// Full dashboard (KPIs + all charts)
router.get("/", authMiddleware, getDashboardData);

// Dedicated weekly progress track endpoint (4-week history + this week KPI)
router.get("/weekly-progress", authMiddleware, getWeeklyProgressTrack);

// Dedicated phase progress track endpoint (per-phase breakdown for latest roadmap)
router.get("/phase-progress", authMiddleware, getPhaseProgressTrack);

export default router;
