import bcrypt from "bcrypt";
import { AppError } from "../../utils/app-error";
import { prismaMock } from "../helpers/prisma-mock";
jest.mock("../../configs/db", () => ({
  __esModule: true,
  prisma: require("../helpers/prisma-mock").prismaMock,
  default: require("../helpers/prisma-mock").prismaMock,
}));
jest.mock("bcrypt");

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
import {
  registerUser,
  loginUser,
  logOut,
  refreshAccessTokenService,
} from "../../services/auth.service";

const mockUser = {
  id: "user-123",
  name: "Test User",
  email: "test@example.com",
  password: "$2b$08$hashedpassword",
  refreshToken: "old-refresh-token",
  experience: null,
  education: null,
  skills: [],
  avatarUrl: null,
  bannerUrl: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};
describe("registerUser", () => {
  it("throws 409 when email already exists", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "existing-id" } as any);
    await expect(
      registerUser("Alice", "test@example.com", "password123"),
    ).rejects.toThrow(new AppError(409, "User already exists with this email"));
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: "test@example.com" },
      select: { id: true },
    });
  });
  it("creates user and returns userData without password", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    (mockedBcrypt.hash as jest.Mock).mockResolvedValue(
      "$2b$08$hashed" as never,
    );

    const createdUser = {
      id: "new-user-id",
      name: "Alice",
      email: "alice@example.com",
      experience: null,
      education: null,
      skills: [],
      avatarUrl: null,
      bannerUrl: null,
      createdAt: new Date(),
    };
    prismaMock.user.create.mockResolvedValue(createdUser as any);

    const result = await registerUser(
      "Alice",
      "alice@example.com",
      "securePass1!",
    );
    expect(mockedBcrypt.hash).toHaveBeenCalledWith("securePass1!", 8);
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "alice@example.com",
          name: "Alice",
        }),
      }),
    );
    expect(result.userData).not.toHaveProperty("password");
    expect(result.userData.email).toBe("alice@example.com");
  });
  it("uses bcrypt saltRounds of 8 (not 10)", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    (mockedBcrypt.hash as jest.Mock).mockResolvedValue("hashed" as never);
    prismaMock.user.create.mockResolvedValue({
      id: "x",
      name: "B",
      email: "b@b.com",
      skills: [],
      experience: null,
      education: null,
      avatarUrl: null,
      bannerUrl: null,
      createdAt: new Date(),
    } as any);
    await registerUser("B", "b@b.com", "pass");
    expect(mockedBcrypt.hash).toHaveBeenCalledWith("pass", 8);
  });
});
describe("loginUser", () => {
  it("throws 401 when user is not found", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    await expect(loginUser("notfound@example.com", "password")).rejects.toThrow(
      new AppError(401, "Invalid email or password"),
    );
  });
  it("throws 401 when password is wrong", async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
    (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false as never);
    await expect(
      loginUser("test@example.com", "wrongpassword"),
    ).rejects.toThrow(new AppError(401, "Invalid email or password"));
  });
  it("returns tokens and userData on successful login", async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
    (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true as never);
    prismaMock.user.update.mockResolvedValue({ id: mockUser.id } as any);

    const result = await loginUser("test@example.com", "correctpassword");
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.userData).not.toHaveProperty("password");
    expect(result.userData.email).toBe("test@example.com");
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: mockUser.id },
        data: expect.objectContaining({ refreshToken: result.refreshToken }),
      }),
    );
  });
  it("fetches user with only necessary select fields", async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
    (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true as never);
    prismaMock.user.update.mockResolvedValue({ id: mockUser.id } as any);
    await loginUser("test@example.com", "password");
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          id: true,
          email: true,
          password: true,
        }),
      }),
    );
  });
});
describe("logOut", () => {
  it("nullifies the refreshToken for the given user", async () => {
    prismaMock.user.update.mockResolvedValue({ id: "user-123" } as any);
    await logOut("user-123");
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-123" },
      data: { refreshToken: null },
    });
  });
});
describe("refreshAccessTokenService", () => {
  it("throws 401 when token is invalid / can't be verified", async () => {
    await expect(
      refreshAccessTokenService("totally-invalid-token"),
    ).rejects.toThrow(new AppError(401, "Invalid or expired refresh token"));
  });
  it("throws 401 when stored token does not match incoming token", async () => {

    const jwt = require("jsonwebtoken");
    const validToken = jwt.sign(
      { id: "user-123" },
      process.env.REFRESH_TOKEN_SECRET!,
      { expiresIn: "7d" },
    );
    prismaMock.user.findUnique.mockResolvedValue({
      ...mockUser,
      refreshToken: "different-token",
    } as any);
    await expect(refreshAccessTokenService(validToken)).rejects.toThrow(
      new AppError(401, "Invalid or expired refresh token"),
    );
  });
  it("returns new tokens when refresh token is valid and matches stored token", async () => {

    const jwt = require("jsonwebtoken");
    const validToken = jwt.sign(
      { id: "user-123" },
      process.env.REFRESH_TOKEN_SECRET!,
      { expiresIn: "7d" },
    );
    prismaMock.user.findUnique.mockResolvedValue({
      ...mockUser,
      refreshToken: validToken,
    } as any);
    prismaMock.user.update.mockResolvedValue({ id: "user-123" } as any);

    const result = await refreshAccessTokenService(validToken);
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
  });
});
