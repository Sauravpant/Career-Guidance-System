import prisma from "../configs/db";
import { AppError } from "../utils/app-error";
import { TYPE } from "../generated/prisma";

class ResourceService {

  async getResources(userId: string) {

    return prisma.resource.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getResourcesByPhase(userId: string, phaseId: string) {

    const phase = await prisma.roadmapPhase.findFirst({
      where: {
        id: phaseId,
        roadmap: { userId },
      },
    });

    if (!phase) {
      throw new AppError(404, "Phase not found or does not belong to user");
    }

    return prisma.resource.findMany({
      where: { phaseId },
      orderBy: { createdAt: "asc" },
    });
  }

  async createResource(
    userId: string,
    data: {
      phaseId?: string | null;
      title: string;
      description: string;
      url: string;
      type: "GLOBAL" | "PHASE";
    },
  ) {

    return prisma.resource.create({
      data: {
        userId,
        phaseId: data.phaseId || null,
        title: data.title,
        description: data.description,
        url: data.url,
        type: data.type === "GLOBAL" ? TYPE.GLOBAL : TYPE.PHASE,
      },
    });
  }

  async updateResource(
    userId: string,
    resourceId: string,
    data: {
      title?: string;
      description?: string;
      url?: string;
    },
  ) {

    const resource = await prisma.resource.findFirst({
      where: { id: resourceId, userId },
    });

    if (!resource) {
      throw new AppError(404, "Resource not found");
    }

    return prisma.resource.update({
      where: { id: resourceId },
      data,
    });
  }

  async deleteResource(userId: string, resourceId: string) {

    const resource = await prisma.resource.findFirst({
      where: { id: resourceId, userId },
    });

    if (!resource) {
      throw new AppError(404, "Resource not found");
    }

    await prisma.resource.delete({
      where: { id: resourceId },
    });

    return true;
  }
}

export default new ResourceService();
