import { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler";
import * as roadmapService from "../services/roadmap.service";
import { ApiResponse } from "../utils/api-response";

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
  };
}

export const getRoadmap = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user.id;

  const roadmap = await roadmapService.fetchRoadmapFromML(userId);

  res.json(
    new ApiResponse(200, "Roadmap fetched successfully", roadmap)
  );
});