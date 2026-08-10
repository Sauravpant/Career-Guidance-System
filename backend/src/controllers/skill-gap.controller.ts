import { Response } from "express";
import { asyncHandler } from "../utils/async-handler";
import skillGapService from "../services/skill-gap.service";
import { ApiResponse } from "../utils/api-response";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { AppError } from "../utils/app-error";

export const getAvailableCareers = asyncHandler(

  async (_req: AuthenticatedRequest, res: Response) => {

    const careers = skillGapService.getAvailableCareers();

    return res
      .status(200)
      .json(new ApiResponse(200, careers, "Available career tracks fetched"));
  },
);

export const runAnalysis = asyncHandler(

  async (req: AuthenticatedRequest, res: Response) => {

    const userId = req.user.id;
    const { careerName } = req.body;

    if (!careerName) {
      throw new AppError(400, "careerName is required in request body");
    }

    const result = await skillGapService.runAnalysis(userId, careerName);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          result,
          "Skill gap analysis completed successfully",
        ),
      );
  },
);

export const getHistory = asyncHandler(

  async (req: AuthenticatedRequest, res: Response) => {

    const userId = req.user.id;
    const history = await skillGapService.getHistory(userId);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          history,
          "Skill gap analysis history fetched successfully",
        ),
      );
  },
);

export const getSkillProgress = asyncHandler(

  async (req: AuthenticatedRequest, res: Response) => {

    const userId = req.user.id;
    const progressList = await skillGapService.getSkillProgress(userId);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          progressList,
          "User skills progress fetched successfully",
        ),
      );
  },
);

export const upsertSkillProgress = asyncHandler(

  async (req: AuthenticatedRequest, res: Response) => {

    const userId = req.user.id;
    const { skillName, status, score } = req.body;

    if (!skillName || !status) {
      throw new AppError(
        400,
        "skillName and status (e.g. COMPLETED, LEARNING, WANT_TO_LEARN) are required",
      );
    }

    const progress = await skillGapService.upsertSkillProgress(
      userId,
      skillName,
      status,
      score || 0.0,
    );

    return res
      .status(200)
      .json(
        new ApiResponse(200, progress, "Skill progress updated successfully"),
      );
  },
);
