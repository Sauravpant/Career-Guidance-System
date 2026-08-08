import { Response } from "express";
import { asyncHandler } from "../utils/async-handler";
import weeklyGoalService from "../services/weekly-goal.service";
import { ApiResponse } from "../utils/api-response";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { AppError } from "../utils/app-error";

export const getWeeklyGoals = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user.id;
  const { date } = req.query; // optional date string in week

  const goals = await weeklyGoalService.getWeeklyGoals(userId, date ? new Date(date as string) : new Date());

  return res
    .status(200)
    .json(new ApiResponse(200, goals, "Weekly goals fetched successfully"));
});

export const createWeeklyGoal = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user.id;
  const { title, date } = req.body;

  if (!title) {
    throw new AppError(400, "Goal title is required");
  }

  const goal = await weeklyGoalService.createWeeklyGoal(userId, title, date ? new Date(date) : new Date());

  return res
    .status(201)
    .json(new ApiResponse(201, goal, "Weekly goal created successfully"));
});

export const updateWeeklyGoal = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user.id;
  const id = req.params.id as string;
  const { completed, title } = req.body;

  const goal = await weeklyGoalService.updateWeeklyGoal(userId, id, {
    completed,
    title,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, goal, "Weekly goal updated successfully"));
});

export const deleteWeeklyGoal = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user.id;
  const id = req.params.id as string;

  await weeklyGoalService.deleteWeeklyGoal(userId, id);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Weekly goal deleted successfully"));
});
