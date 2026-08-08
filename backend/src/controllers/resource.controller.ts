import { Response } from "express";
import { asyncHandler } from "../utils/async-handler";
import resourceService from "../services/resource.service";
import { ApiResponse } from "../utils/api-response";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { AppError } from "../utils/app-error";

export const getResources = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user.id;
  const resources = await resourceService.getResources(userId);

  return res
    .status(200)
    .json(new ApiResponse(200, resources, "Resources fetched successfully"));
});

export const getResourcesByPhase = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user.id;
  const phaseId = req.params.phaseId as string;

  if (!phaseId) {
    throw new AppError(400, "Phase ID is required");
  }

  const resources = await resourceService.getResourcesByPhase(userId, phaseId);

  return res
    .status(200)
    .json(new ApiResponse(200, resources, "Phase resources fetched successfully"));
});

export const createResource = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user.id;
  const { phaseId, title, description, url, type } = req.body;

  if (!title || !url || !type) {
    throw new AppError(400, "Title, url, and type (GLOBAL/PHASE) are required");
  }

  const resource = await resourceService.createResource(userId, {
    phaseId: phaseId as string | null,
    title,
    description: description || "",
    url,
    type,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, resource, "Resource created successfully"));
});

export const updateResource = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user.id;
  const id = req.params.id as string;
  const { title, description, url } = req.body;

  const resource = await resourceService.updateResource(userId, id, {
    title,
    description,
    url,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, resource, "Resource updated successfully"));
});

export const deleteResource = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user.id;
  const id = req.params.id as string;

  await resourceService.deleteResource(userId, id);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Resource deleted successfully"));
});
