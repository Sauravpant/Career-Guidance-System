import { Response } from "express";
import userService from "../services/user.service";
import { asyncHandler } from "../utils/async-handler";
import { ApiResponse } from "../utils/api-response";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";

export const getMe = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = await userService.getMe(req.user.id);

  return res.status(200).json(
    new ApiResponse(200, user, "User fetched successfully")
  );
});

export const updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { education, experience, skills } = req.body;

  const updatedUser = await userService.updateUserProfile(req.user.id, {
    education,
    experience,
    skills,
  });

  return res.status(200).json(
    new ApiResponse(200, updatedUser, "Profile updated successfully")
  );
});

export const deleteMe = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await userService.deleteMe(req.user.id);

  return res.status(200).json(
    new ApiResponse(200, null, "User deleted successfully")
  );
});











//controller to take education,experience and skills of user as input
//education - string, experince -integer, skills - string array

