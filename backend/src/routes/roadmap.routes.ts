import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { getRoadmap } from "../controllers/roadmap.ccontroller";

const router = Router();

router.get("/generate", authMiddleware, getRoadmap);

export default router;