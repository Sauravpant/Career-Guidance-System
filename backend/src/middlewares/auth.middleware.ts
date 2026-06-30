import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../configs/db";
import { asyncHandler } from "../utils/async-handler";
import type { User } from "../generated/prisma";
import { AppError } from "../utils/app-error";

const JWT_SECRET = process.env.ACCESS_TOKEN_SECRET || "";

export interface AuthenticatedRequest extends Request {
  user: User;
}

export const authMiddleware = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const token = req.cookies?.accessToken;
  if (!token) {
    throw new AppError(401, "Unauthorized access - No token provided");
  }

  try {
    const decodedToken = jwt.verify(token, JWT_SECRET) as { id: string };
    const user = await prisma.user.findUnique({
      where: {
        id: decodedToken.id,
      },
    });

    if (!user) {
      throw new AppError(401, "Invalid token - User not found");
    }

    req.user = user;
    next();
  } catch (error: unknown) {
    // If the error is already an AppError, rethrow it to preserve status/message
    if (error instanceof AppError) throw error;

    // For JWT verification errors and others, wrap in a 401 AppError
    throw new AppError(401, "Unauthorized access - Invalid or expired token");
  }
});
