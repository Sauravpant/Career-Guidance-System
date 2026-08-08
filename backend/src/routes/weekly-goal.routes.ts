import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import {
  getWeeklyGoals,
  createWeeklyGoal,
  updateWeeklyGoal,
  deleteWeeklyGoal,
} from "../controllers/weekly-goal.controller";

const router = Router();

router.get("/", authMiddleware, getWeeklyGoals);
router.post("/", authMiddleware, createWeeklyGoal);
router.patch("/:id", authMiddleware, updateWeeklyGoal);
router.delete("/:id", authMiddleware, deleteWeeklyGoal);

export default router;
