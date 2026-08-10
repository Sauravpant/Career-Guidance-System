import prisma from "../configs/db";
import { AppError } from "../utils/app-error";

export function getStartOfWeek(dateInput: Date | string | number): Date {

  const date = new Date(dateInput);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);

  return monday;
}

class WeeklyGoalService {

  async getWeeklyGoals(userId: string, dateInWeek: string | Date = new Date()) {

    const weekStart = getStartOfWeek(dateInWeek);
    const weekEnd = new Date(weekStart.getTime());
    weekEnd.setDate(weekEnd.getDate() + 7);

    return prisma.weeklyGoal.findMany({
      where: {
        userId,
        weekStart: {
          gte: weekStart,
          lt: weekEnd,
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async createWeeklyGoal(
    userId: string,
    title: string,
    dateInWeek: string | Date = new Date(),
  ) {

    const weekStart = getStartOfWeek(dateInWeek);

    return prisma.weeklyGoal.create({
      data: {
        userId,
        title,
        completed: false,
        weekStart,
      },
    });
  }

  async updateWeeklyGoal(
    userId: string,
    goalId: string,
    data: {
      completed?: boolean;
      title?: string;
    },
  ) {

    const goal = await prisma.weeklyGoal.findFirst({
      where: { id: goalId, userId },
    });

    if (!goal) {
      throw new AppError(404, "Weekly goal not found");
    }

    return prisma.weeklyGoal.update({
      where: { id: goalId },
      data,
    });
  }

  async deleteWeeklyGoal(userId: string, goalId: string) {

    const goal = await prisma.weeklyGoal.findFirst({
      where: { id: goalId, userId },
    });

    if (!goal) {
      throw new AppError(404, "Weekly goal not found");
    }

    await prisma.weeklyGoal.delete({
      where: { id: goalId },
    });

    return true;
  }
}

export default new WeeklyGoalService();
