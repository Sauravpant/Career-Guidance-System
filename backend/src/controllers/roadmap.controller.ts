import { Response } from "express";
import { asyncHandler } from "../utils/async-handler";
import roadmapService from "../services/roadmap.service";
import { ApiResponse } from "../utils/api-response";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { AppError } from "../utils/app-error";

export const generateRoadmap = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user.id;
  const { careerName } = req.body;

  if (!careerName) {
    throw new AppError(400, "Please provide careerName in the request body");
  }

  const roadmap = await roadmapService.generateRoadmap(userId, careerName);

  return res
    .status(200)
    .json(new ApiResponse(200, roadmap, "Roadmap generated successfully"));
});

export const getRoadmap = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user.id;
  const roadmapId = req.params.roadmapId as string;

  if (!roadmapId) {
    throw new AppError(400, "Roadmap ID is required");
  }

  const roadmap = await roadmapService.getRoadmap(roadmapId, userId);

  return res
    .status(200)
    .json(new ApiResponse(200, roadmap, "Roadmap fetched successfully"));
});

export const getMyRoadmap = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user.id;

  const roadmap = await roadmapService.getMyRoadmap(userId);

  if (!roadmap) {
    return res
      .status(200)
      .json(new ApiResponse(200, null, "No roadmap found for this user"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, roadmap, "Roadmap fetched successfully"));
});

export const getUserRoadmaps = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user.id;

  const roadmaps = await roadmapService.getUserRoadmaps(userId);

  return res
    .status(200)
    .json(new ApiResponse(200, roadmaps, "Roadmaps fetched successfully"));
});

export const togglePhaseProgress = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user.id;
  const phaseId = req.params.phaseId as string;
  const { completed } = req.body;

  if (completed === undefined) {
    throw new AppError(400, "completed (boolean) status is required in request body");
  }

  const progress = await roadmapService.togglePhaseProgress(userId, phaseId, !!completed);

  return res
    .status(200)
    .json(new ApiResponse(200, progress, "Phase progress updated successfully"));
});

export const getPhaseById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user.id;
  const phaseId = req.params.phaseId as string;

  if (!phaseId) {
    throw new AppError(400, "Phase ID is required");
  }

  const phase = await roadmapService.getPhaseById(phaseId, userId);

  return res
    .status(200)
    .json(new ApiResponse(200, phase, "Phase details fetched successfully"));
});

