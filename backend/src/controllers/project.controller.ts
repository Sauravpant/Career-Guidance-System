import { Response } from "express";
import { asyncHandler } from "../utils/async-handler";
import projectService from "../services/project.service";
import { ApiResponse } from "../utils/api-response";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { AppError } from "../utils/app-error";

export const getProjects = asyncHandler(

  async (req: AuthenticatedRequest, res: Response) => {

    const userId = req.user.id;
    const projects = await projectService.getProjects(userId);

    return res
      .status(200)
      .json(new ApiResponse(200, projects, "Projects fetched successfully"));
  },
);

export const getProjectsByPhase = asyncHandler(

  async (req: AuthenticatedRequest, res: Response) => {

    const userId = req.user.id;
    const phaseId = req.params.phaseId as string;

    if (!phaseId) {
      throw new AppError(400, "Phase ID is required");
    }

    const projects = await projectService.getProjectsByPhase(userId, phaseId);

    return res
      .status(200)
      .json(
        new ApiResponse(200, projects, "Phase projects fetched successfully"),
      );
  },
);

export const createProject = asyncHandler(

  async (req: AuthenticatedRequest, res: Response) => {

    const userId = req.user.id;
    const { phaseId, title, description, steps, type } = req.body;

    if (!title || !description || !type) {
      throw new AppError(
        400,
        "Title, description, and type (GLOBAL/PHASE) are required",
      );
    }

    const project = await projectService.createProject(userId, {
      phaseId: phaseId as string | null,
      title,
      description,
      steps: Array.isArray(steps) ? steps.join("\n") : String(steps || ""),
      type,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, project, "Project created successfully"));
  },
);

export const updateProject = asyncHandler(

  async (req: AuthenticatedRequest, res: Response) => {

    const userId = req.user.id;
    const id = req.params.id as string;
    const { title, description, steps } = req.body;
    const updateData: any = {};

    if (title !== undefined) updateData.title = title;

    if (description !== undefined) updateData.description = description;

    if (steps !== undefined) {
      updateData.steps = Array.isArray(steps)
        ? steps.join("\n")
        : String(steps || "");
    }

    const project = await projectService.updateProject(userId, id, updateData);

    return res
      .status(200)
      .json(new ApiResponse(200, project, "Project updated successfully"));
  },
);

export const deleteProject = asyncHandler(

  async (req: AuthenticatedRequest, res: Response) => {

    const userId = req.user.id;
    const id = req.params.id as string;
    await projectService.deleteProject(userId, id);

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Project deleted successfully"));
  },
);
