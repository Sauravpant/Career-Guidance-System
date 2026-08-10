import { Request, Response, NextFunction } from "express";
import {
  authMiddleware,
  AuthenticatedRequest,
} from "../../middlewares/auth.middleware";
import { generateAccessToken } from "../../utils/token";
import jwt from "jsonwebtoken";

function buildReqResNext(token?: string) {

  const req = {
    cookies: token ? { accessToken: token } : {},
  } as unknown as AuthenticatedRequest;

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;

  const next = jest.fn() as NextFunction;

  return { req, res, next };
}

describe("authMiddleware", () => {
  it("calls next with AppError 401 when no accessToken cookie is present", async () => {

    const { req, res, next } = buildReqResNext();
    await (authMiddleware as any)(req, res, next);
    // Wait a tick for the promise to resolve internally
    await new Promise(process.nextTick);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401 }),
    );
  });
  it("calls next with AppError 401 for a completely invalid token string", async () => {

    const { req, res, next } = buildReqResNext("not-a-jwt");
    await (authMiddleware as any)(req, res, next);
    await new Promise(process.nextTick);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401 }),
    );
  });
  it("calls next with AppError 401 for a token signed with a wrong secret", async () => {

    const wrongToken = jwt.sign({ id: "user-1" }, "wrong-secret", {
      expiresIn: "15m",
    });

    const { req, res, next } = buildReqResNext(wrongToken);
    await (authMiddleware as any)(req, res, next);
    await new Promise(process.nextTick);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401 }),
    );
  });
  it("calls next with AppError 401 for an expired access token", async () => {

    const expired = jwt.sign(
      { id: "user-1" },
      process.env.ACCESS_TOKEN_SECRET!,
      { expiresIn: -1 },
    );

    const { req, res, next } = buildReqResNext(expired);
    await (authMiddleware as any)(req, res, next);
    await new Promise(process.nextTick);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401 }),
    );
  });
  it("calls next() and attaches user.id for a valid access token", async () => {

    const token = generateAccessToken("user-abc");
    const { req, res, next } = buildReqResNext(token);
    await (authMiddleware as any)(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual({ id: "user-abc" });
  });
  it("does NOT make any DB calls (stateless JWT-only validation)", async () => {

    const token = generateAccessToken("user-xyz");
    const { req, res, next } = buildReqResNext(token);
    await (authMiddleware as any)(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
