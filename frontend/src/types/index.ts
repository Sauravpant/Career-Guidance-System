export interface LoginCredentials {
  email: string;
  password?: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  education: string | null;
  experience: number | null;
  skills: string[];
  avatarUrl: string | null;
  bannerUrl: string | null;
  createdAt: string;
}

export interface Career {
  id: string;
  name: string;
  requiredSkills: string[];
  createdAt: string;
}

export interface PhaseProgress {
  id: string;
  userId: string;
  phaseId: string;
  completed: boolean;
  updatedAt: string;
}

export interface Project {
  id: string;
  userId: string;
  phaseId: string | null;
  title: string;
  description: string;
  steps: string; // JSON string or line separated steps
  type: 'GLOBAL' | 'PHASE';
  createdAt: string;
}

export interface Resource {
  id: string;
  userId: string;
  phaseId: string | null;
  title: string;
  description: string;
  url: string;
  type: 'GLOBAL' | 'PHASE';
  createdAt: string;
}

export interface RoadmapPhase {
  id: string;
  roadmapId: string;
  phaseNumber: number;
  title: string;
  description: string;
  topics: string[];
  createdAt: string;
  progress: PhaseProgress[];
  resources?: Resource[];
  projects?: Project[];
}

export interface Roadmap {
  id: string;
  userId: string;
  careerId: string;
  title: string;
  createdAt: string;
  career: Career;
  phases: RoadmapPhase[];
  globalResources: Resource[];
  globalProjects: Project[];
}

export interface WeeklyGoal {
  id: string;
  userId: string;
  title: string;
  completed: boolean;
  weekStart: string;
  createdAt: string;
  updatedAt: string;
}

export interface SkillProgress {
  id: string;
  userId: string;
  skillName: string;
  status: 'LEARNING' | 'COMPLETED' | 'WANT_TO_LEARN';
  score: number;
  createdAt: string;
  updatedAt: string;
}

export interface SkillGapHistory {
  id: string;
  userId: string;
  careerName: string;
  score: number; // match percentage
  matchingSkills: string[];
  missingSkills: string[];
  createdAt: string;
}

export interface DashboardKPIs {
  totalSkills: number;
  totalRoadmaps: number;
  overallRoadmapProgress: number;
  latestSkillGapScore: number;
  averageSkillMatch: number;
  weeklyGoalsThisWeek: {
    total: number;
    completed: number;
    completionPercent: number;
  };
  weeklyProgressTrend: number;
}

export interface DashboardCharts {
  roadmapProgress: {
    id: string;
    title: string;
    careerName: string;
    totalPhases: number;
    completedPhases: number;
    progressPercent: number;
  } | null;
  perPhaseProgress: Array<{
    phaseId: string;
    phaseNumber: number;
    title: string;
    completed: boolean;
  }>;
  skillGapHistory: Array<{
    careerName: string;
    score: number;
    createdAt: string;
  }>;
  skillDistribution: {
    completed: number;
    learning: number;
    wantToLearn: number;
  };
  weeklyGoalHistory: Array<{
    weekOf: string;
    total: number;
    completed: number;
    completionPercent: number;
  }>;
}

export interface DashboardResponse {
  kpis: DashboardKPIs;
  charts: DashboardCharts;
}

export interface CareerRecommendation {
  id: string;
  userId: string;
  bestCareer: string;
  confidence: number;
  top3: any; // Object containing details
  createdAt: string;
}
