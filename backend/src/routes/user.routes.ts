import express from "express";
import { getMe, updateProfile, deleteMe } from "../controllers/user.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = express.Router();

router.get("/me", authMiddleware, getMe);
router.patch("/update-profile", authMiddleware, updateProfile);
router.delete("/delete-me", authMiddleware, deleteMe);

export default router;
