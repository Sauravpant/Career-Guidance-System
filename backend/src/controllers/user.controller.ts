import { Response } from "express";
import userService from "../services/user.service";
import recommendationService from "../services/recommendation.service";
import { asyncHandler } from "../utils/async-handler";
import { ApiResponse } from "../utils/api-response";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import prisma from "../configs/db";
import roadmapService from "../services/roadmap.service";

export const getMe = asyncHandler(

  async (req: AuthenticatedRequest, res: Response) => {

    const user = await userService.getMe(req.user.id);

    return res
      .status(200)
      .json(new ApiResponse(200, user, "User fetched successfully"));
  },
);

export const updateProfile = asyncHandler(

  async (req: AuthenticatedRequest, res: Response) => {

    const { name, education, experience, skills, avatarUrl, bannerUrl } =
      req.body;

    const updateData: any = {};

    if (name !== undefined && typeof name === "string" && name.trim()) {
      updateData.name = name.trim();
    }

    if (education !== undefined) {
      updateData.education =
        typeof education === "string" ? education.trim() : education;
    }

    if (experience !== undefined && experience !== null && experience !== "") {

      const parsedExp = Number(experience);

      if (!isNaN(parsedExp)) {
        updateData.experience = parsedExp;
      }

    } else if (experience === null || experience === "") {
      updateData.experience = null;
    }

    if (skills !== undefined) {

      if (Array.isArray(skills)) {
        updateData.skills = skills
          .map((s: any) => String(s).trim())
          .filter(Boolean);
      } else if (typeof skills === "string") {
        updateData.skills = skills
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean);
      } else if (skills === null) {
        updateData.skills = [];
      }
    }

    if (avatarUrl !== undefined) {
      updateData.avatarUrl =
        typeof avatarUrl === "string" ? avatarUrl.trim() || null : null;
    }

    if (bannerUrl !== undefined) {
      updateData.bannerUrl =
        typeof bannerUrl === "string" ? bannerUrl.trim() || null : null;
    }

    const updatedUser = await userService.updateUserProfile(
      req.user.id,
      updateData,
    );

    const { refreshToken, password, ...user } = updatedUser;

    return res
      .status(200)
      .json(new ApiResponse(200, user, "Profile updated successfully"));
  },
);

export const deleteMe = asyncHandler(

  async (req: AuthenticatedRequest, res: Response) => {
    await userService.deleteMe(req.user.id);

    return res
      .status(200)
      .json(new ApiResponse(200, null, "User deleted successfully"));
  },
);

export const getCareerRecommendation = asyncHandler(

  async (req: AuthenticatedRequest, res: Response) => {

    const userId = req.user.id;
    const recommendation =
      await recommendationService.getRecommendation(userId);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          recommendation,
          "Career recommendation fetched successfully",
        ),
      );
  },
);

export const exploreCareers = asyncHandler(

  async (req: AuthenticatedRequest, res: Response) => {

    const { skills, experience } = req.body;
    let parsedSkills: string[] = [];

    if (Array.isArray(skills)) {
      parsedSkills = skills.map((s: any) => String(s).trim()).filter(Boolean);
    } else if (typeof skills === "string") {
      parsedSkills = skills
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);
    }

    const parsedExp = Number(experience) || 0;
    const recommendation = await recommendationService.exploreCareers(
      parsedSkills,
      parsedExp,
    );

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          recommendation,
          "Explored career recommendations successfully",
        ),
      );
  },
);

export const selectCareer = asyncHandler(

  async (req: AuthenticatedRequest, res: Response) => {

    const userId = req.user.id;
    const { careerName } = req.body;

    if (!careerName || typeof careerName !== "string") {

      return res
        .status(400)
        .json(new ApiResponse(400, null, "careerName is required"));
    }

    const userRoadmaps = await prisma.roadmap.findMany({
      where: { userId },
      select: { id: true },
    });

    const roadmapIds = userRoadmaps.map((r) => r.id);
    await Promise.all([
      prisma.phaseProgress.deleteMany({ where: { userId } }),
      prisma.project.deleteMany({ where: { userId } }),
      prisma.resource.deleteMany({ where: { userId } }),
      prisma.weeklyGoal.deleteMany({ where: { userId } }),
      prisma.skillProgress.deleteMany({ where: { userId } }),
      prisma.skillGapHistory.deleteMany({ where: { userId } }),
    ]);

    if (roadmapIds.length > 0) {
      await prisma.roadmapPhase.deleteMany({
        where: { roadmapId: { in: roadmapIds } },
      });
    }

    await prisma.roadmap.deleteMany({ where: { userId } });

    const roadmap = await roadmapService.generateRoadmap(userId, careerName);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { career: careerName, roadmap },
          "Career selected and new roadmap generated successfully",
        ),
      );
  },
);

export const getRecommendationHistory = asyncHandler(

  async (req: AuthenticatedRequest, res: Response) => {

    const userId = req.user.id;
    const history =
      await recommendationService.getRecommendationHistory(userId);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          history,
          "Recommendation history fetched successfully",
        ),
      );
  },
);
