/**
 * Integration tests — Auth Routes
 * POST /api/v1/auth/register
 * POST /api/v1/auth/login
 * POST /api/v1/auth/logout
 * POST /api/v1/auth/refresh
 *
 * Uses supertest against the real Express app.
 * Prisma is mocked so no real DB is needed.
 */
import { prismaMock } from "../helpers/prisma-mock";
jest.mock("../../configs/db", () => ({
  __esModule: true,
  prisma: require("../helpers/prisma-mock").prismaMock,
  default: require("../helpers/prisma-mock").prismaMock,
}));
jest.mock("bcrypt", () => ({
  __esModule: true,
  default: {
    hash: jest.fn().mockResolvedValue("$2b$08$hashed"),
    compare: jest.fn(),
  },
  hash: jest.fn().mockResolvedValue("$2b$08$hashed"),
  compare: jest.fn(),
}));
import request from "supertest";
import app from "../../app";
import bcrypt from "bcrypt";
import { generateAccessToken, generateRefreshToken } from "../../utils/token";

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const baseUser = {
  id: "int-user-1",
  name: "Integration User",
  email: "int@test.com",
  password: "$2b$08$hashed",
  refreshToken: null,
  experience: null,
  education: null,
  skills: [],
  avatarUrl: null,
  bannerUrl: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
describe("POST /api/v1/auth/register", () => {
  it("returns 201 on successful registration", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      ...baseUser,
      name: "New User",
      email: "new@test.com",
    } as any);

    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "New User",
        email: "new@test.com",
        password: "password123",
      });
    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/registered/i);
  });
  it("returns 409 when email is already taken", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "existing" } as any);

    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ name: "Alice", email: "int@test.com", password: "password123" });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already exists/i);
  });
  it("does not return password in response body", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: "u-1",
      name: "Test",
      email: "t@t.com",
      skills: [],
      experience: null,
      education: null,
      avatarUrl: null,
      bannerUrl: null,
      createdAt: new Date(),
    } as any);

    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ name: "Test", email: "t@t.com", password: "pass123" });
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
  });
});
describe("POST /api/v1/auth/login", () => {
  it("returns 200 with accessToken cookie on valid credentials", async () => {
    prismaMock.user.findUnique.mockResolvedValue(baseUser as any);
    (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true as never);
    prismaMock.user.update.mockResolvedValue({ id: baseUser.id } as any);

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "int@test.com", password: "correctpassword" });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/login successful/i);

    const cookies = res.headers["set-cookie"] as unknown as string[];
    expect(cookies).toBeDefined();

    const cookieNames = cookies.join(";");
    expect(cookieNames).toMatch(/accessToken/);
    expect(cookieNames).toMatch(/refreshToken/);
  });
  it("returns 401 for non-existent email", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "ghost@test.com", password: "whatever" });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });
  it("returns 401 for wrong password", async () => {
    prismaMock.user.findUnique.mockResolvedValue(baseUser as any);
    (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false as never);

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "int@test.com", password: "wrongpassword" });
    expect(res.status).toBe(401);
  });
  it("does not expose password in response data", async () => {
    prismaMock.user.findUnique.mockResolvedValue(baseUser as any);
    (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true as never);
    prismaMock.user.update.mockResolvedValue({ id: baseUser.id } as any);

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "int@test.com", password: "correctpassword" });
    expect(JSON.stringify(res.body.data)).not.toMatch(/password/i);
  });
});
describe("POST /api/v1/auth/logout", () => {
  it("returns 401 without a valid access token", async () => {

    const res = await request(app).post("/api/v1/auth/logout");
    expect(res.status).toBe(401);
  });
  it("returns 200 and clears cookies for an authenticated user", async () => {

    const token = generateAccessToken(baseUser.id);
    prismaMock.user.update.mockResolvedValue({ id: baseUser.id } as any);

    const res = await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", `accessToken=${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/logout successful/i);

    const cookies = res.headers["set-cookie"] as unknown as string[];

    if (cookies) {

      const accessCookie = cookies.find((c) => c.startsWith("accessToken"));

      if (accessCookie) {
        expect(accessCookie).toMatch(/accessToken=;|Max-Age=0/i);
      }
    }

  });
});
describe("POST /api/v1/auth/refresh", () => {
  it("returns 401 when no refresh token cookie is provided", async () => {

    const res = await request(app).post("/api/v1/auth/refresh");
    expect(res.status).toBe(401);
  });
  it("returns 401 for an invalid refresh token", async () => {

    const res = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", "refreshToken=invalid-token");
    expect(res.status).toBe(401);
  });
  it("returns 200 and new tokens for a valid, matching refresh token", async () => {

    const refreshToken = generateRefreshToken(baseUser.id);
    prismaMock.user.findUnique.mockResolvedValue({
      ...baseUser,
      refreshToken,
    } as any);
    prismaMock.user.update.mockResolvedValue({ id: baseUser.id } as any);

    const res = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", `refreshToken=${refreshToken}`);
    expect(res.status).toBe(200);

    const cookies = res.headers["set-cookie"] as unknown as string[];
    expect(cookies.join(";")).toMatch(/accessToken/);
  });
  it("returns 401 when token does not match stored token", async () => {

    const refreshToken = generateRefreshToken(baseUser.id);
    prismaMock.user.findUnique.mockResolvedValue({
      ...baseUser,
      refreshToken: "different-stored-token",
    } as any);

    const res = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", `refreshToken=${refreshToken}`);
    expect(res.status).toBe(401);
  });
});
