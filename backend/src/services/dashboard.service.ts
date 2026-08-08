import prisma from "../configs/db";
import { getStartOfWeek } from "./weekly-goal.service";

class DashboardService {
  async getDashboardData(userId: string) {
    // 1. Get User info & current skills count
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        skills: true,
      },
    });

    const totalSkills = user?.skills.length || 0;

    // 2. Roadmaps count
    const totalRoadmaps = await prisma.roadmap.count({
      where: { userId },
    });

    // 3. Overall Roadmap phase completion progress
    const phasesCount = await prisma.roadmapPhase.count({
      where: { roadmap: { userId } },
    });

    const completedPhasesCount = await prisma.phaseProgress.count({
      where: {
        userId,
        completed: true,
      },
    });

    const overallRoadmapProgress = phasesCount > 0 ? (completedPhasesCount / phasesCount) * 100 : 0;

    // 4. Latest Roadmap progress details
    const latestRoadmap = await prisma.roadmap.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        career: true,
        phases: {
          include: {
            progress: {
              where: { userId },
            },
          },
        },
      },
    });

    let latestRoadmapProgress = null;
    if (latestRoadmap) {
      const totalPhases = latestRoadmap.phases.length;
      const completedPhases = latestRoadmap.phases.filter((p) => p.progress[0]?.completed === true).length;
      latestRoadmapProgress = {
        id: latestRoadmap.id,
        title: latestRoadmap.title,
        careerName: latestRoadmap.career.name,
        totalPhases,
        completedPhases,
        progressPercent: totalPhases > 0 ? (completedPhases / totalPhases) * 100 : 0,
      };
    }

    // 5. Weekly Goals for current week
    const now = new Date();
    const currentWeekStart = getStartOfWeek(now);
    const nextWeekStart = new Date(currentWeekStart.getTime());
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);

    const weeklyGoals = await prisma.weeklyGoal.findMany({
      where: {
        userId,
        weekStart: {
          gte: currentWeekStart,
          lt: nextWeekStart,
        },
      },
    });

    const totalWeeklyGoals = weeklyGoals.length;
    const completedWeeklyGoals = weeklyGoals.filter((g) => g.completed).length;

    // 6. Skill Gap Score KPI (average score from latest runs)
    const latestSkillGapAnalyses = await prisma.skillGapHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const averageSkillMatch =
      latestSkillGapAnalyses.length > 0
        ? latestSkillGapAnalyses.reduce((acc, curr) => acc + curr.score, 0) / latestSkillGapAnalyses.length
        : 0;

    const latestSkillGapScore = latestSkillGapAnalyses[0]?.score || 0;

    // 7. Skill Gap Progress history (for line graph over time)
    const skillGapHistoryChart = latestSkillGapAnalyses
      .map((item) => ({
        careerName: item.careerName,
        score: item.score,
        createdAt: item.createdAt,
      }))
      .reverse(); // Chronological order for graphs

    // 8. Skill Progress distribution (completed, learning, want to learn) for Pie/Doughnut Chart
    const skillProgressList = await prisma.skillProgress.findMany({
      where: { userId },
    });

    const skillDistribution = {
      completed: skillProgressList.filter((s) => s.status === "COMPLETED").length,
      learning: skillProgressList.filter((s) => s.status === "LEARNING").length,
      wantToLearn: skillProgressList.filter((s) => s.status === "WANT_TO_LEARN").length,
    };

    // 9. Historical Weekly Goals Progress (for past 4 weeks bar chart)
    const weeklyGoalHistoryChart = [];
    for (let i = 3; i >= 0; i--) {
      const tempDate = new Date();
      tempDate.setDate(tempDate.getDate() - i * 7);
      const start = getStartOfWeek(tempDate);
      const end = new Date(start.getTime());
      end.setDate(end.getDate() + 7);

      const goals = await prisma.weeklyGoal.findMany({
        where: {
          userId,
          weekStart: {
            gte: start,
            lt: end,
          },
        },
      });

      // Always push all 4 weeks — even if there are 0 goals (so frontend chart always has 4 data points)
      weeklyGoalHistoryChart.push({
        weekOf: start.toISOString().split("T")[0],
        total: goals.length,
        completed: goals.filter((g) => g.completed).length,
        completionPercent: goals.length > 0 ? Math.round((goals.filter((g) => g.completed).length / goals.length) * 100) : 0,
      });
    }
    // Already in chronological order (i goes from 3..0)

    // 10. Per-phase progress for the latest roadmap (for frontend phase tracker)
    const perPhaseProgress = latestRoadmap
      ? latestRoadmap.phases.map((p) => ({
          phaseId: (p as any).id,
          phaseNumber: (p as any).phaseNumber,
          title: (p as any).title,
          completed: (p as any).progress[0]?.completed === true,
        }))
      : [];

    // 11. Weekly progress trend: current week vs last week (for KPI percentage change card)
    const lastWeekStart = new Date(currentWeekStart.getTime());
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekGoals = await prisma.weeklyGoal.findMany({
      where: {
        userId,
        weekStart: {
          gte: lastWeekStart,
          lt: currentWeekStart,
        },
      },
    });
    const lastWeekCompletionPercent =
      lastWeekGoals.length > 0
        ? (lastWeekGoals.filter((g) => g.completed).length / lastWeekGoals.length) * 100
        : 0;
    const currentWeekCompletionPercent =
      totalWeeklyGoals > 0
        ? (completedWeeklyGoals / totalWeeklyGoals) * 100
        : 0;
    const weeklyProgressTrend = currentWeekCompletionPercent - lastWeekCompletionPercent;

    // 12. Compile response
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
              ? Math.round((completedWeeklyGoals / totalWeeklyGoals) * 100 * 100) / 100
              : 0,
        },
        weeklyProgressTrend: Math.round(weeklyProgressTrend * 100) / 100, // Δ% vs last week
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

  // ─── Dedicated: Weekly Progress Track ────────────────────────────────────
  async getWeeklyProgressTrack(userId: string) {
    const now = new Date();
    const currentWeekStart = getStartOfWeek(now);
    const nextWeekStart = new Date(currentWeekStart.getTime());
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);

    // Current week goals
    const currentWeekGoals = await prisma.weeklyGoal.findMany({
      where: {
        userId,
        weekStart: { gte: currentWeekStart, lt: nextWeekStart },
      },
    });

    const total = currentWeekGoals.length;
    const completed = currentWeekGoals.filter((g) => g.completed).length;

    // Last week for trend calculation
    const lastWeekStart = new Date(currentWeekStart.getTime());
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekGoals = await prisma.weeklyGoal.findMany({
      where: {
        userId,
        weekStart: { gte: lastWeekStart, lt: currentWeekStart },
      },
    });
    const lastCompleted = lastWeekGoals.filter((g) => g.completed).length;
    const lastTotal = lastWeekGoals.length;

    const currentPct = total > 0 ? (completed / total) * 100 : 0;
    const lastPct = lastTotal > 0 ? (lastCompleted / lastTotal) * 100 : 0;
    const trend = Math.round((currentPct - lastPct) * 100) / 100;

    // 4-week history chart
    const history = [];
    for (let i = 3; i >= 0; i--) {
      const tempDate = new Date();
      tempDate.setDate(tempDate.getDate() - i * 7);
      const start = getStartOfWeek(tempDate);
      const end = new Date(start.getTime());
      end.setDate(end.getDate() + 7);

      const goals = await prisma.weeklyGoal.findMany({
        where: { userId, weekStart: { gte: start, lt: end } },
      });

      history.push({
        weekOf: start.toISOString().split("T")[0],
        total: goals.length,
        completed: goals.filter((g) => g.completed).length,
        completionPercent:
          goals.length > 0
            ? Math.round((goals.filter((g) => g.completed).length / goals.length) * 100)
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
      trend, // positive = improved vs last week, negative = declined
      history,
    };
  }

  // ─── Dedicated: Phase Progress Track ─────────────────────────────────────
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
      (p) => p.progress[0]?.completed === true
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
