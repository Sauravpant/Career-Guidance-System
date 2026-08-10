import { prismaMock } from "../helpers/prisma-mock";
jest.mock("../../configs/db", () => ({
  __esModule: true,
  prisma: require("../helpers/prisma-mock").prismaMock,
  default: require("../helpers/prisma-mock").prismaMock,
}));
import skillGapService from "../../services/skill-gap.service";
import { AppError } from "../../utils/app-error";

const USER_ID = "user-abc";
const mockUser = {
  id: USER_ID,
  skills: ["Python", "SQL", "Pandas"],
  experience: 2,
};

const mockHistoryEntry = {
  id: "hist-1",
  userId: USER_ID,
  careerName: "Data Scientist",
  score: 50,
  matchingSkills: ["Python", "SQL", "Pandas"],
  missingSkills: ["R", "Machine Learning"],
  createdAt: new Date(),
};
// ── getAvailableCareers ────────────────────────────────────────────────────
describe("getAvailableCareers", () => {
  it("returns an array of career track strings", () => {

    const careers = skillGapService.getAvailableCareers();
    expect(Array.isArray(careers)).toBe(true);
    expect(careers.length).toBeGreaterThan(0);
    expect(careers).toContain("Data Scientist");
    expect(careers).toContain("Full Stack Developer");
  });
});
describe("runAnalysis", () => {
  beforeEach(() => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
    prismaMock.skillProgress.findMany.mockResolvedValue([] as any);
    prismaMock.skillProgress.upsert.mockResolvedValue({} as any);
    prismaMock.skillGapHistory.create.mockImplementation(async (args: any) => ({
      ...mockHistoryEntry,
      ...args.data,
    }));
    prismaMock.user.update.mockResolvedValue(mockUser as any);
  });
  it("throws 400 when career track is unknown", async () => {
    await expect(
      skillGapService.runAnalysis(USER_ID, "Underwater Basket Weaving"),
    ).rejects.toThrow(AppError);
    await expect(
      skillGapService.runAnalysis(USER_ID, "Underwater Basket Weaving"),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
  it("accepts exact career name (case-insensitive)", async () => {

    const result = await skillGapService.runAnalysis(USER_ID, "data scientist");
    expect(result).toHaveProperty("careerName", "Data Scientist");
  });
  it("fuzzy-matches partial career name", async () => {

    const result = await skillGapService.runAnalysis(USER_ID, "full stack");
    expect(result.careerName).toBe("Full Stack Developer");
  });
  it("correctly separates matching and missing skills", async () => {

    const result = await skillGapService.runAnalysis(USER_ID, "Data Scientist");
    expect(result.matchingSkills).toEqual(
      expect.arrayContaining(["Python", "SQL", "Pandas"]),
    );
    expect(result.missingSkills.length).toBeGreaterThan(0);
    expect(result.missingSkills).not.toContain("Python");
    expect(result.missingSkills).not.toContain("SQL");
  });
  it("computes score as percentage of matching skills", async () => {

    const result = await skillGapService.runAnalysis(USER_ID, "Data Scientist");
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
  it("saves analysis result to skillGapHistory", async () => {
    await skillGapService.runAnalysis(USER_ID, "Data Scientist");
    expect(prismaMock.skillGapHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: USER_ID,
          careerName: "Data Scientist",
        }),
      }),
    );
  });
  it("batches skill progress upserts (one call per skill)", async () => {
    await skillGapService.runAnalysis(USER_ID, "Data Scientist");
    expect(prismaMock.skillProgress.upsert).toHaveBeenCalled();
  });
  it("includes COMPLETED skills from skillProgress in matching", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      ...mockUser,
      skills: [],
    } as any);
    prismaMock.skillProgress.findMany.mockResolvedValue([
      { skillName: "python" },
      { skillName: "machine learning" },
    ] as any);

    const result = await skillGapService.runAnalysis(USER_ID, "Data Scientist");
    expect(result.matchingSkills).toEqual(
      expect.arrayContaining(["Python", "Machine Learning"]),
    );
  });
});
describe("getHistory", () => {
  it("returns history entries ordered by createdAt desc", async () => {

    const history = [mockHistoryEntry, { ...mockHistoryEntry, id: "hist-2" }];
    prismaMock.skillGapHistory.findMany.mockResolvedValue(history as any);

    const result = await skillGapService.getHistory(USER_ID);
    expect(result).toHaveLength(2);
    expect(prismaMock.skillGapHistory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: USER_ID },
        orderBy: { createdAt: "desc" },
      }),
    );
  });
  it("returns empty array when no history exists", async () => {
    prismaMock.skillGapHistory.findMany.mockResolvedValue([] as any);

    const result = await skillGapService.getHistory(USER_ID);
    expect(result).toEqual([]);
  });
});
describe("getSkillProgress", () => {
  it("returns skill progress list for the user", async () => {

    const progress = [
      {
        id: "sp-1",
        userId: USER_ID,
        skillName: "python",
        status: "COMPLETED",
        score: 1.0,
      },
      {
        id: "sp-2",
        userId: USER_ID,
        skillName: "r",
        status: "WANT_TO_LEARN",
        score: 0,
      },
    ];
    prismaMock.skillProgress.findMany.mockResolvedValue(progress as any);

    const result = await skillGapService.getSkillProgress(USER_ID);
    expect(result).toHaveLength(2);
    expect(result[0].status).toBe("COMPLETED");
  });
});
describe("upsertSkillProgress", () => {

  const mockProgress = {
    id: "sp-1",
    userId: USER_ID,
    skillName: "python",
    status: "COMPLETED",
    score: 1.0,
  };
  beforeEach(() => {
    prismaMock.skillProgress.upsert.mockResolvedValue(mockProgress as any);
    prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
    prismaMock.user.update.mockResolvedValue(mockUser as any);
  });
  it("normalizes skillName to lowercase", async () => {
    await skillGapService.upsertSkillProgress(USER_ID, "Python", "COMPLETED");
    expect(prismaMock.skillProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_skillName: { userId: USER_ID, skillName: "python" } },
      }),
    );
  });
  it("adds skill to user.skills array when status is COMPLETED", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      ...mockUser,
      skills: ["Python"],
    } as any);
    await skillGapService.upsertSkillProgress(
      USER_ID,
      "javascript",
      "COMPLETED",
    );
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: USER_ID },
        data: expect.objectContaining({
          skills: expect.arrayContaining(["javascript"]),
        }),
      }),
    );
  });
  it("does NOT duplicate skill in user.skills if already present", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      ...mockUser,
      skills: ["Python"],
    } as any);
    await skillGapService.upsertSkillProgress(USER_ID, "Python", "COMPLETED");
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });
  it("removes skill from user.skills when status changes to WANT_TO_LEARN", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      ...mockUser,
      skills: ["Python", "SQL"],
    } as any);
    await skillGapService.upsertSkillProgress(
      USER_ID,
      "Python",
      "WANT_TO_LEARN",
    );
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          skills: expect.not.arrayContaining(["Python"]),
        }),
      }),
    );
  });
  it("fetches user and upserts skillProgress in parallel (both called)", async () => {
    await skillGapService.upsertSkillProgress(
      USER_ID,
      "TypeScript",
      "LEARNING",
    );
    expect(prismaMock.skillProgress.upsert).toHaveBeenCalledTimes(1);
    expect(prismaMock.user.findUnique).toHaveBeenCalledTimes(1);
  });
});
