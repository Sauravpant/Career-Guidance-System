import prisma from "../configs/db";
import { getStartOfWeek } from "./weekly-goal.service";

class DashboardService {

  async getDashboardData(userId: string) {

    const now = new Date();
    const currentWeekStart = getStartOfWeek(now);
    const nextWeekStart = new Date(currentWeekStart.getTime());
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);

    const lastWeekStart = new Date(currentWeekStart.getTime());
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const threeWeeksAgoDate = new Date();
    threeWeeksAgoDate.setDate(threeWeeksAgoDate.getDate() - 3 * 7);

    const historyStart = getStartOfWeek(threeWeeksAgoDate);
    const [
      user,
      totalRoadmaps,
      phasesCount,
      completedPhasesCount,
      latestRoadmap,
      weeklyGoals,
      lastWeekGoals,
      latestSkillGapAnalyses,
      skillProgressList,
      allWeeklyGoalHistory,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { skills: true },
      }),
      prisma.roadmap.count({ where: { userId } }),
      prisma.roadmapPhase.count({ where: { roadmap: { userId } } }),
      prisma.phaseProgress.count({ where: { userId, completed: true } }),
      prisma.roadmap.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: {
          career: true,
          phases: {
            include: {
              progress: { where: { userId } },
            },
          },
        },
      }),
      prisma.weeklyGoal.findMany({
        where: {
          userId,
          weekStart: { gte: currentWeekStart, lt: nextWeekStart },
        },
      }),
      prisma.weeklyGoal.findMany({
        where: {
          userId,
          weekStart: { gte: lastWeekStart, lt: currentWeekStart },
        },
      }),
      prisma.skillGapHistory.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.skillProgress.findMany({ where: { userId } }),
      prisma.weeklyGoal.findMany({
        where: {
          userId,
          weekStart: { gte: historyStart, lt: nextWeekStart },
        },
      }),
    ]);

    const totalSkills = user?.skills.length || 0;
    const overallRoadmapProgress =
      phasesCount > 0 ? (completedPhasesCount / phasesCount) * 100 : 0;

    let latestRoadmapProgress = null;

    if (latestRoadmap) {

      const totalPhases = latestRoadmap.phases.length;
      const completedPhases = latestRoadmap.phases.filter(
        (p) => p.progress[0]?.completed === true,
      ).length;
      latestRoadmapProgress = {
        id: latestRoadmap.id,
        title: latestRoadmap.title,
        careerName: latestRoadmap.career.name,
        totalPhases,
        completedPhases,
        progressPercent:
          totalPhases > 0 ? (completedPhases / totalPhases) * 100 : 0,
      };
    }

    const totalWeeklyGoals = weeklyGoals.length;
    const completedWeeklyGoals = weeklyGoals.filter((g) => g.completed).length;
    const averageSkillMatch =
      latestSkillGapAnalyses.length > 0
        ? latestSkillGapAnalyses.reduce((acc, curr) => acc + curr.score, 0) /
          latestSkillGapAnalyses.length
        : 0;

    const latestSkillGapScore = latestSkillGapAnalyses[0]?.score || 0;
    const skillGapHistoryChart = latestSkillGapAnalyses
      .map((item) => ({
        careerName: item.careerName,
        score: item.score,
        createdAt: item.createdAt,
      }))
      .reverse();

    const skillDistribution = {
      completed: skillProgressList.filter((s) => s.status === "COMPLETED")
        .length,
      learning: skillProgressList.filter((s) => s.status === "LEARNING").length,
      wantToLearn: skillProgressList.filter((s) => s.status === "WANT_TO_LEARN")
        .length,
    };

    const weeklyGoalHistoryChart = [];

    for (let i = 3; i >= 0; i--) {

      const tempDate = new Date();
      tempDate.setDate(tempDate.getDate() - i * 7);

      const start = getStartOfWeek(tempDate);
      const end = new Date(start.getTime());
      end.setDate(end.getDate() + 7);

      const startMs = start.getTime();
      const endMs = end.getTime();
      const goals = allWeeklyGoalHistory.filter((g) => {
        const t = new Date(g.weekStart).getTime();

        return t >= startMs && t < endMs;
      });
      weeklyGoalHistoryChart.push({
        weekOf: start.toISOString().split("T")[0],
        total: goals.length,
        completed: goals.filter((g) => g.completed).length,
        completionPercent:
          goals.length > 0
            ? Math.round(
                (goals.filter((g) => g.completed).length / goals.length) * 100,
              )
            : 0,
      });
    }

    const perPhaseProgress = latestRoadmap
      ? latestRoadmap.phases.map((p) => ({
          phaseId: (p as any).id,
          phaseNumber: (p as any).phaseNumber,
          title: (p as any).title,
          completed: (p as any).progress[0]?.completed === true,
        }))
      : [];

    const lastWeekCompletionPercent =
      lastWeekGoals.length > 0
        ? (lastWeekGoals.filter((g) => g.completed).length /
            lastWeekGoals.length) *
          100
        : 0;

    const currentWeekCompletionPercent =
      totalWeeklyGoals > 0
        ? (completedWeeklyGoals / totalWeeklyGoals) * 100
        : 0;

    const weeklyProgressTrend =
      currentWeekCompletionPercent - lastWeekCompletionPercent;

    return {
      kpis: {
        totalSkills,
        totalRoadmaps,
        overallRoadmapProgress: Math.round(overallRoadmapProgress * 100) / 100,
        latestSkillGapScore: Math.round(latestSkillGapScore * 100) / 100,
        averageSkillMatch: Math.round(averageSkillMatch * 100) / 100,
        weeklyGoalsThisWeek: {
          total: totalWeeklyGoals,
          completed: completedWeeklyGoals,
          completionPercent:
            totalWeeklyGoals > 0
              ? Math.round(
                  (completedWeeklyGoals / totalWeeklyGoals) * 100 * 100,
                ) / 100
              : 0,
        },
        weeklyProgressTrend: Math.round(weeklyProgressTrend * 100) / 100,
      },
      charts: {
        roadmapProgress: latestRoadmapProgress,
        perPhaseProgress,
        skillGapHistory: skillGapHistoryChart,
        skillDistribution,
        weeklyGoalHistory: weeklyGoalHistoryChart,
      },
    };
  }

  async getWeeklyProgressTrack(userId: string) {

    const now = new Date();
    const currentWeekStart = getStartOfWeek(now);
    const nextWeekStart = new Date(currentWeekStart.getTime());
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);

    const lastWeekStart = new Date(currentWeekStart.getTime());
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const threeWeeksAgoDate = new Date();
    threeWeeksAgoDate.setDate(threeWeeksAgoDate.getDate() - 3 * 7);

    const historyStart = getStartOfWeek(threeWeeksAgoDate);
    const [currentWeekGoals, lastWeekGoals, allHistory] = await Promise.all([
      prisma.weeklyGoal.findMany({
        where: {
          userId,
          weekStart: { gte: currentWeekStart, lt: nextWeekStart },
        },
      }),
      prisma.weeklyGoal.findMany({
        where: {
          userId,
          weekStart: { gte: lastWeekStart, lt: currentWeekStart },
        },
      }),
      prisma.weeklyGoal.findMany({
        where: { userId, weekStart: { gte: historyStart, lt: nextWeekStart } },
      }),
    ]);

    const total = currentWeekGoals.length;
    const completed = currentWeekGoals.filter((g) => g.completed).length;
    const lastCompleted = lastWeekGoals.filter((g) => g.completed).length;
    const lastTotal = lastWeekGoals.length;
    const currentPct = total > 0 ? (completed / total) * 100 : 0;
    const lastPct = lastTotal > 0 ? (lastCompleted / lastTotal) * 100 : 0;
    const trend = Math.round((currentPct - lastPct) * 100) / 100;
    const history = [];

    for (let i = 3; i >= 0; i--) {

      const tempDate = new Date();
      tempDate.setDate(tempDate.getDate() - i * 7);

      const start = getStartOfWeek(tempDate);
      const end = new Date(start.getTime());
      end.setDate(end.getDate() + 7);

      const startMs = start.getTime();
      const endMs = end.getTime();
      const goals = allHistory.filter((g) => {
        const t = new Date(g.weekStart).getTime();

        return t >= startMs && t < endMs;
      });
      history.push({
        weekOf: start.toISOString().split("T")[0],
        total: goals.length,
        completed: goals.filter((g) => g.completed).length,
        completionPercent:
          goals.length > 0
            ? Math.round(
                (goals.filter((g) => g.completed).length / goals.length) * 100,
              )
            : 0,
      });
    }

    return {
      currentWeek: {
        weekStart: currentWeekStart.toISOString().split("T")[0],
        total,
        completed,
        remaining: total - completed,
        completionPercent: Math.round(currentPct * 100) / 100,
      },
      trend,
      history,
    };
  }

  async getPhaseProgressTrack(userId: string) {

    const latestRoadmap = await prisma.roadmap.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        career: true,
        phases: {
          orderBy: { phaseNumber: "asc" },
          include: {
            progress: { where: { userId } },
          },
        },
      },
    });

    if (!latestRoadmap) {

      return {
        roadmapId: null,
        roadmapTitle: null,
        careerName: null,
        totalPhases: 0,
        completedPhases: 0,
        progressPercent: 0,
        phases: [],
      };
    }

    const totalPhases = latestRoadmap.phases.length;
    const completedPhases = latestRoadmap.phases.filter(
      (p) => p.progress[0]?.completed === true,
    ).length;

    return {
      roadmapId: latestRoadmap.id,
      roadmapTitle: latestRoadmap.title,
      careerName: latestRoadmap.career.name,
      totalPhases,
      completedPhases,
      progressPercent:
        totalPhases > 0
          ? Math.round((completedPhases / totalPhases) * 100 * 100) / 100
          : 0,
      phases: latestRoadmap.phases.map((p) => ({
        phaseId: p.id,
        phaseNumber: p.phaseNumber,
        title: p.title,
        completed: p.progress[0]?.completed === true,
        updatedAt: p.progress[0]?.updatedAt ?? null,
      })),
    };
  }
}

export default new DashboardService();
