import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import {
  getResources,
  getResourcesByPhase,
  createResource,
  updateResource,
  deleteResource,
} from "../controllers/resource.controller";

const router = Router();
router.get("/", authMiddleware, getResources);
router.get("/phase/:phaseId", authMiddleware, getResourcesByPhase);
router.post("/", authMiddleware, createResource);
router.patch("/:id", authMiddleware, updateResource);
router.delete("/:id", authMiddleware, deleteResource);

export default router;
