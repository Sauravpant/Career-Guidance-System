import { prismaMock } from "../helpers/prisma-mock";
jest.mock("../../configs/db", () => ({
  __esModule: true,
  prisma: require("../helpers/prisma-mock").prismaMock,
  default: require("../helpers/prisma-mock").prismaMock,
}));
jest.mock("axios");
import request from "supertest";
import app from "../../app";
import axios from "axios";
import { generateAccessToken } from "../../utils/token";

const mockedAxios = axios as jest.Mocked<typeof axios>;
const USER_ID = "career-user-1";
const authToken = generateAccessToken(USER_ID);
const authCookie = `accessToken=${authToken}`;
const mockUser = {
  id: USER_ID,
  name: "Career User",
  email: "career@test.com",
  skills: ["Python", "TensorFlow", "Machine Learning"],
  experience: 3,
};

const mlResponse = {
  data: {
    best_career: "AI/ML Engineer",
    confidence: 0.91,
    top_3_recommendations: [
      { career: "AI/ML Engineer", score: 0.91 },
      { career: "Data Scientist", score: 0.8 },
      { career: "Data Analyst", score: 0.6 },
    ],
  },
};

const savedRecommendation = {
  id: "rec-1",
  userId: USER_ID,
  bestCareer: "AI/ML Engineer",
  confidence: 0.91,
  top3: mlResponse.data.top_3_recommendations,
  createdAt: new Date().toISOString(),
};
describe("POST /api/v1/user/recommend-career", () => {
  beforeEach(() => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
    (mockedAxios.post as jest.Mock).mockResolvedValue(mlResponse);
    prismaMock.recommendation.create.mockResolvedValue(
      savedRecommendation as any,
    );
  });
  it("returns 401 without auth token", async () => {

    const res = await request(app).post("/api/v1/user/recommend-career");
    expect(res.status).toBe(401);
  });
  it("returns 400 when user has no skills", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      ...mockUser,
      skills: [],
    } as any);

    const res = await request(app)
      .post("/api/v1/user/recommend-career")
      .set("Cookie", authCookie);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/skills/i);
  });
  it("returns 200 with best_career and top3", async () => {

    const res = await request(app)
      .post("/api/v1/user/recommend-career")
      .set("Cookie", authCookie);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("bestCareer", "AI/ML Engineer");
    expect(res.body.data).toHaveProperty("confidence");
    expect(res.body.data.top3).toHaveLength(3);
  });
  it("returns 404 when user does not exist", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/v1/user/recommend-career")
      .set("Cookie", authCookie);
    expect(res.status).toBe(404);
  });
});
describe("POST /api/v1/user/explore-careers", () => {
  beforeEach(() => {
    (mockedAxios.post as jest.Mock).mockResolvedValue(mlResponse);
  });
  it("returns 401 without auth", async () => {

    const res = await request(app)
      .post("/api/v1/user/explore-careers")
      .send({ skills: ["Python"], experience: 2 });
    expect(res.status).toBe(401);
  });
  it("returns 400 when skills array is empty", async () => {

    const res = await request(app)
      .post("/api/v1/user/explore-careers")
      .set("Cookie", authCookie)
      .send({ skills: [], experience: 0 });
    expect(res.status).toBe(400);
  });
  it("returns 200 with career recommendations for provided skills", async () => {

    const res = await request(app)
      .post("/api/v1/user/explore-careers")
      .set("Cookie", authCookie)
      .send({ skills: ["React", "Node.js"], experience: 2 });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("bestCareer");
    expect(res.body.data).toHaveProperty("top3");
  });
  it("accepts skills as a comma-separated string", async () => {

    const res = await request(app)
      .post("/api/v1/user/explore-careers")
      .set("Cookie", authCookie)
      .send({ skills: "Python,SQL,Pandas", experience: 1 });
    expect(res.status).toBe(200);
  });
});
describe("GET /api/v1/user/recommendation-history", () => {
  it("returns 401 without auth", async () => {

    const res = await request(app).get("/api/v1/user/recommendation-history");
    expect(res.status).toBe(401);
  });
  it("returns 200 with recommendation history array", async () => {
    prismaMock.recommendation.findMany.mockResolvedValue([
      savedRecommendation,
    ] as any);

    const res = await request(app)
      .get("/api/v1/user/recommendation-history")
      .set("Cookie", authCookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0].bestCareer).toBe("AI/ML Engineer");
  });
  it("returns empty array when no recommendations made yet", async () => {
    prismaMock.recommendation.findMany.mockResolvedValue([] as any);

    const res = await request(app)
      .get("/api/v1/user/recommendation-history")
      .set("Cookie", authCookie);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});
describe("POST /api/v1/user/select-career", () => {
  beforeEach(() => {
    prismaMock.roadmap.findMany.mockResolvedValue([] as any);
    prismaMock.phaseProgress.deleteMany.mockResolvedValue({ count: 0 } as any);
    prismaMock.project.deleteMany.mockResolvedValue({ count: 0 } as any);
    prismaMock.resource.deleteMany.mockResolvedValue({ count: 0 } as any);
    prismaMock.weeklyGoal.deleteMany.mockResolvedValue({ count: 0 } as any);
    prismaMock.skillProgress.deleteMany.mockResolvedValue({ count: 0 } as any);
    prismaMock.skillGapHistory.deleteMany.mockResolvedValue({
      count: 0,
    } as any);
    prismaMock.roadmapPhase.deleteMany.mockResolvedValue({ count: 0 } as any);
    prismaMock.roadmap.deleteMany.mockResolvedValue({ count: 0 } as any);
    prismaMock.roadmap.findFirst.mockResolvedValue(null);
    prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
  });
  it("returns 401 without auth", async () => {

    const res = await request(app)
      .post("/api/v1/user/select-career")
      .send({ careerName: "Data Scientist" });
    expect(res.status).toBe(401);
  });
  it("returns 400 when careerName is missing", async () => {

    const res = await request(app)
      .post("/api/v1/user/select-career")
      .set("Cookie", authCookie)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/careerName is required/i);
  });
  it("returns 400 when careerName is not a string", async () => {

    const res = await request(app)
      .post("/api/v1/user/select-career")
      .set("Cookie", authCookie)
      .send({ careerName: 123 });
    expect(res.status).toBe(400);
  });
});
