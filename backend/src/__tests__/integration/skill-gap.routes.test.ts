import { prismaMock } from "../helpers/prisma-mock";
jest.mock("../../configs/db", () => ({
  __esModule: true,
  prisma: require("../helpers/prisma-mock").prismaMock,
  default: require("../helpers/prisma-mock").prismaMock,
}));
import request from "supertest";
import app from "../../app";
import { generateAccessToken } from "../../utils/token";

const USER_ID = "sg-user-1";
const authToken = generateAccessToken(USER_ID);
const authCookie = `accessToken=${authToken}`;
const mockUser = {
  id: USER_ID,
  skills: ["Python", "SQL"],
  experience: 2,
};

const mockHistory = [
  {
    id: "h1",
    userId: USER_ID,
    careerName: "Data Scientist",
    score: 40,
    matchingSkills: ["Python", "SQL"],
    missingSkills: ["R", "Machine Learning"],
    createdAt: new Date().toISOString(),
  },
];

const mockProgress = [
  {
    id: "sp1",
    userId: USER_ID,
    skillName: "python",
    status: "COMPLETED",
    score: 1.0,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "sp2",
    userId: USER_ID,
    skillName: "r",
    status: "WANT_TO_LEARN",
    score: 0,
    updatedAt: new Date().toISOString(),
  },
];
describe("GET /api/v1/skill-gaps/careers", () => {
  it("returns 401 without auth token", async () => {

    const res = await request(app).get("/api/v1/skill-gaps/careers");
    expect(res.status).toBe(401);
  });
  it("returns 200 with an array of career strings", async () => {

    const res = await request(app)
      .get("/api/v1/skill-gaps/careers")
      .set("Cookie", authCookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data).toContain("Data Scientist");
  });
});
describe("POST /api/v1/skill-gaps/analyze", () => {
  beforeEach(() => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
    prismaMock.skillProgress.findMany.mockResolvedValue([] as any);
    prismaMock.skillProgress.upsert.mockResolvedValue({} as any);
    prismaMock.user.update.mockResolvedValue(mockUser as any);
    prismaMock.skillGapHistory.create.mockResolvedValue({
      id: "new-hist",
      userId: USER_ID,
      careerName: "Data Scientist",
      score: 20,
      matchingSkills: ["Python", "SQL"],
      missingSkills: ["R"],
      createdAt: new Date().toISOString(),
    } as any);
  });
  it("returns 401 without auth", async () => {

    const res = await request(app)
      .post("/api/v1/skill-gaps/analyze")
      .send({ careerName: "Data Scientist" });
    expect(res.status).toBe(401);
  });
  it("returns 400 when careerName is missing from body", async () => {

    const res = await request(app)
      .post("/api/v1/skill-gaps/analyze")
      .set("Cookie", authCookie)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/careerName is required/i);
  });
  it("returns 400 for unknown career track", async () => {

    const res = await request(app)
      .post("/api/v1/skill-gaps/analyze")
      .set("Cookie", authCookie)
      .send({ careerName: "Underwater Basket Weaving" });
    expect(res.status).toBe(400);
  });
  it("returns 200 with analysis result for a valid career", async () => {

    const res = await request(app)
      .post("/api/v1/skill-gaps/analyze")
      .set("Cookie", authCookie)
      .send({ careerName: "Data Scientist" });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("score");
    expect(res.body.data).toHaveProperty("matchingSkills");
    expect(res.body.data).toHaveProperty("missingSkills");
    expect(res.body.data).toHaveProperty("careerName", "Data Scientist");
  });
  it("accepts case-insensitive career name", async () => {

    const res = await request(app)
      .post("/api/v1/skill-gaps/analyze")
      .set("Cookie", authCookie)
      .send({ careerName: "data scientist" });
    expect(res.status).toBe(200);
    expect(res.body.data.careerName).toBe("Data Scientist");
  });
});
describe("GET /api/v1/skill-gaps/history", () => {
  it("returns 401 without auth", async () => {

    const res = await request(app).get("/api/v1/skill-gaps/history");
    expect(res.status).toBe(401);
  });
  it("returns 200 with history array", async () => {
    prismaMock.skillGapHistory.findMany.mockResolvedValue(mockHistory as any);

    const res = await request(app)
      .get("/api/v1/skill-gaps/history")
      .set("Cookie", authCookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0].careerName).toBe("Data Scientist");
  });
  it("returns empty array when no history exists", async () => {
    prismaMock.skillGapHistory.findMany.mockResolvedValue([] as any);

    const res = await request(app)
      .get("/api/v1/skill-gaps/history")
      .set("Cookie", authCookie);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});
describe("GET /api/v1/skill-gaps/progress", () => {
  it("returns 401 without auth", async () => {

    const res = await request(app).get("/api/v1/skill-gaps/progress");
    expect(res.status).toBe(401);
  });
  it("returns 200 with skill progress list", async () => {
    prismaMock.skillProgress.findMany.mockResolvedValue(mockProgress as any);

    const res = await request(app)
      .get("/api/v1/skill-gaps/progress")
      .set("Cookie", authCookie);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0]).toHaveProperty("skillName", "python");
  });
});
describe("POST /api/v1/skill-gaps/progress", () => {
  beforeEach(() => {
    prismaMock.skillProgress.upsert.mockResolvedValue({
      id: "sp-new",
      userId: USER_ID,
      skillName: "docker",
      status: "LEARNING",
      score: 0,
    } as any);
    prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
    prismaMock.user.update.mockResolvedValue(mockUser as any);
  });
  it("returns 401 without auth", async () => {

    const res = await request(app)
      .post("/api/v1/skill-gaps/progress")
      .send({ skillName: "docker", status: "LEARNING" });
    expect(res.status).toBe(401);
  });
  it("returns 400 when skillName is missing", async () => {

    const res = await request(app)
      .post("/api/v1/skill-gaps/progress")
      .set("Cookie", authCookie)
      .send({ status: "LEARNING" });
    expect(res.status).toBe(400);
  });
  it("returns 400 when status is missing", async () => {

    const res = await request(app)
      .post("/api/v1/skill-gaps/progress")
      .set("Cookie", authCookie)
      .send({ skillName: "docker" });
    expect(res.status).toBe(400);
  });
  it("returns 200 and updated progress on valid input", async () => {

    const res = await request(app)
      .post("/api/v1/skill-gaps/progress")
      .set("Cookie", authCookie)
      .send({ skillName: "Docker", status: "LEARNING" });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("skillName", "docker");
    expect(res.body.data).toHaveProperty("status", "LEARNING");
  });
  it("accepts all valid status values", async () => {

    const statuses = ["COMPLETED", "LEARNING", "WANT_TO_LEARN"];

    for (const status of statuses) {
      prismaMock.skillProgress.upsert.mockResolvedValue({
        id: "sp-x",
        userId: USER_ID,
        skillName: "docker",
        status,
        score: 0,
      } as any);

      const res = await request(app)
        .post("/api/v1/skill-gaps/progress")
        .set("Cookie", authCookie)
        .send({ skillName: "Docker", status });
      expect(res.status).toBe(200);
    }

  });
});
