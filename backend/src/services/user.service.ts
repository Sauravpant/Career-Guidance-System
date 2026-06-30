import prisma from "../configs/db";
import { UpdateUserData } from "../types/user.types";

class UserService {
  async getMe(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        education: true,
        experience: true,
        skills: true,
        avatarUrl: true,
        bannerUrl: true,
        createdAt: true,
      },
    });
  }

  async updateUserProfile(userId: string, data: UpdateUserData) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        education: data.education,
        experience: data.experience,
        skills: data.skills,
      },
    });
  }

  async deleteMe(userId: string) {
    return prisma.user.delete({
      where: { id: userId },
    });
  }
}

export default new UserService();