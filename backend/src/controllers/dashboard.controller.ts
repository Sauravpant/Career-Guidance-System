import { Response } from "express";
import { asyncHandler } from "../utils/async-handler";
import dashboardService from "../services/dashboard.service";
import { ApiResponse } from "../utils/api-response";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";

export const getDashboardData = asyncHandler(

  async (req: AuthenticatedRequest, res: Response) => {

    const userId = req.user.id;
    const dashboardData = await dashboardService.getDashboardData(userId);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          dashboardData,
          "Dashboard KPIs and chart data fetched successfully",
        ),
      );
  },
);

export const getWeeklyProgressTrack = asyncHandler(

  async (req: AuthenticatedRequest, res: Response) => {

    const userId = req.user.id;
    const data = await dashboardService.getWeeklyProgressTrack(userId);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          data,
          "Weekly progress track fetched successfully",
        ),
      );
  },
);

export const getPhaseProgressTrack = asyncHandler(

  async (req: AuthenticatedRequest, res: Response) => {

    const userId = req.user.id;
    const data = await dashboardService.getPhaseProgressTrack(userId);

    return res
      .status(200)
      .json(
        new ApiResponse(200, data, "Phase progress track fetched successfully"),
      );
  },
);
