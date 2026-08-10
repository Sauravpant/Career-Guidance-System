import prisma from "../configs/db";
import { AppError } from "../utils/app-error";
import { TYPE } from "../generated/prisma";

class ProjectService {

  async getProjects(userId: string) {

    return prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getProjectsByPhase(userId: string, phaseId: string) {

    const phase = await prisma.roadmapPhase.findFirst({
      where: {
        id: phaseId,
        roadmap: { userId },
      },
    });

    if (!phase) {
      throw new AppError(404, "Phase not found or does not belong to user");
    }

    return prisma.project.findMany({
      where: { phaseId },
      orderBy: { createdAt: "asc" },
    });
  }

  async createProject(
    userId: string,
    data: {
      phaseId?: string | null;
      title: string;
      description: string;
      steps: string;
      type: "GLOBAL" | "PHASE";
    },
  ) {

    return prisma.project.create({
      data: {
        userId,
        phaseId: data.phaseId || null,
        title: data.title,
        description: data.description,
        steps: data.steps,
        type: data.type === "GLOBAL" ? TYPE.GLOBAL : TYPE.PHASE,
      },
    });
  }

  async updateProject(
    userId: string,
    projectId: string,
    data: {
      title?: string;
      description?: string;
      steps?: string;
    },
  ) {

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      throw new AppError(404, "Project not found");
    }

    return prisma.project.update({
      where: { id: projectId },
      data,
    });
  }

  async deleteProject(userId: string, projectId: string) {

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      throw new AppError(404, "Project not found");
    }

    await prisma.project.delete({
      where: { id: projectId },
    });

    return true;
  }
}

export default new ProjectService();
