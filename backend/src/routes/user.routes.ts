import express from "express";
import {
  getMe,
  updateProfile,
  deleteMe,
  getCareerRecommendation,
  getRecommendationHistory,
  exploreCareers,
  selectCareer,
} from "../controllers/user.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = express.Router();
router.get("/me", authMiddleware, getMe);
router.patch("/update-profile", authMiddleware, updateProfile);
router.delete("/delete-me", authMiddleware, deleteMe);
router.post("/recommend-career", authMiddleware, getCareerRecommendation);
router.post("/explore-careers", authMiddleware, exploreCareers);
router.post("/select-career", authMiddleware, selectCareer);
router.get("/recommendation-history", authMiddleware, getRecommendationHistory);

export default router;
