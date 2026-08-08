import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import {
  runAnalysis,
  getHistory,
  getSkillProgress,
  upsertSkillProgress,
  getAvailableCareers,
} from "../controllers/skill-gap.controller";

const router = Router();

router.get("/careers", authMiddleware, getAvailableCareers);
router.post("/analyze", authMiddleware, runAnalysis);
router.get("/history", authMiddleware, getHistory);
router.get("/progress", authMiddleware, getSkillProgress);
router.post("/progress", authMiddleware, upsertSkillProgress);

export default router;
