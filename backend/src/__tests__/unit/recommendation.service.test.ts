import { prismaMock } from "../helpers/prisma-mock";
jest.mock("../../configs/db", () => ({
  __esModule: true,
  prisma: require("../helpers/prisma-mock").prismaMock,
  default: require("../helpers/prisma-mock").prismaMock,
}));
jest.mock("axios");
import axios from "axios";
import recommendationService from "../../services/recommendation.service";
import { AppError } from "../../utils/app-error";

const mockedAxios = axios as jest.Mocked<typeof axios>;
const USER_ID = "rec-user-1";
const mockUser = {
  id: USER_ID,
  skills: ["Python", "Machine Learning", "TensorFlow"],
  experience: 3,
};

const mlResponse = {
  data: {
    best_career: "AI/ML Engineer",
    confidence: 0.92,
    top_3_recommendations: [
      { career: "AI/ML Engineer", score: 0.92 },
      { career: "Data Scientist", score: 0.78 },
      { career: "Data Analyst", score: 0.65 },
    ],
  },
};

const savedRecommendation = {
  id: "rec-1",
  userId: USER_ID,
  bestCareer: "AI/ML Engineer",
  confidence: 0.92,
  top3: mlResponse.data.top_3_recommendations,
  createdAt: new Date(),
};
describe("getRecommendation", () => {
  beforeEach(() => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
    (mockedAxios.post as jest.Mock).mockResolvedValue(mlResponse);
    prismaMock.recommendation.create.mockResolvedValue(
      savedRecommendation as any,
    );
  });
  it("throws 404 when user does not exist", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    await expect(
      recommendationService.getRecommendation(USER_ID),
    ).rejects.toThrow(new AppError(404, "User not found"));
  });
  it("throws 400 when user has no skills in profile", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      ...mockUser,
      skills: [],
    } as any);
    await expect(
      recommendationService.getRecommendation(USER_ID),
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });
  it("calls ML service with correct skills and experience payload", async () => {
    await recommendationService.getRecommendation(USER_ID);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      process.env.ML_RECOMMEND_URL,
      {
        skills: mockUser.skills,
        experience: mockUser.experience,
      },
    );
  });
  it("saves recommendation to DB and returns it", async () => {

    const result = await recommendationService.getRecommendation(USER_ID);
    expect(prismaMock.recommendation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: USER_ID,
          bestCareer: "AI/ML Engineer",
          confidence: 0.92,
        }),
      }),
    );
    expect(result.bestCareer).toBe("AI/ML Engineer");
  });
  it("throws AppError when ML service call fails", async () => {

    const mlError: any = new Error("Connection refused");
    mlError.response = { status: 503, data: { detail: "ML service down" } };
    (mockedAxios.post as jest.Mock).mockRejectedValue(mlError);
    await expect(
      recommendationService.getRecommendation(USER_ID),
    ).rejects.toMatchObject({
      statusCode: 503,
    });
  });
  it("defaults experience to 0 when user.experience is null", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      ...mockUser,
      experience: null,
    } as any);
    await recommendationService.getRecommendation(USER_ID);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ experience: 0 }),
    );
  });
});
describe("exploreCareers", () => {
  beforeEach(() => {
    (mockedAxios.post as jest.Mock).mockResolvedValue(mlResponse);
  });
  it("throws 400 when no skills are provided", async () => {
    await expect(
      recommendationService.exploreCareers([], 0),
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });
  it("returns bestCareer, confidence, and top3 from ML service", async () => {

    const result = await recommendationService.exploreCareers(
      ["Python", "React"],
      1,
    );
    expect(result.bestCareer).toBe("AI/ML Engineer");
    expect(result.confidence).toBe(0.92);
    expect(result.top3).toHaveLength(3);
  });
  it("passes correct payload to ML service", async () => {
    await recommendationService.exploreCareers(["Docker", "Kubernetes"], 4);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      process.env.ML_RECOMMEND_URL,
      {
        skills: ["Docker", "Kubernetes"],
        experience: 4,
      },
    );
  });
  it("re-throws AppError from ML service failure", async () => {

    const mlError: any = new Error("timeout");
    mlError.response = { status: 500, data: { detail: "Internal error" } };
    (mockedAxios.post as jest.Mock).mockRejectedValue(mlError);
    await expect(
      recommendationService.exploreCareers(["Python"], 1),
    ).rejects.toMatchObject({ statusCode: 500 });
  });
});
describe("getRecommendationHistory", () => {
  it("returns list of past recommendations for user", async () => {

    const history = [
      savedRecommendation,
      { ...savedRecommendation, id: "rec-2" },
    ];
    prismaMock.recommendation.findMany.mockResolvedValue(history as any);

    const result =
      await recommendationService.getRecommendationHistory(USER_ID);
    expect(result).toHaveLength(2);
    expect(prismaMock.recommendation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: USER_ID },
        orderBy: { createdAt: "desc" },
      }),
    );
  });
  it("returns empty array when no history", async () => {
    prismaMock.recommendation.findMany.mockResolvedValue([] as any);

    const result =
      await recommendationService.getRecommendationHistory(USER_ID);
    expect(result).toEqual([]);
  });
});
