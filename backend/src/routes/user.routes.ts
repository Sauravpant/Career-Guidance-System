import express from "express";
import { getMe, updateProfile, deleteMe } from "../controllers/user.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = express.Router();

router.get("/me", authMiddleware, getMe);
router.put("/me", authMiddleware, updateProfile);
router.delete("/me", authMiddleware, deleteMe);

export default router;
