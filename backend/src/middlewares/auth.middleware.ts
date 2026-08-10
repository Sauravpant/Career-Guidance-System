import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/async-handler";
import { AppError } from "../utils/app-error";

const JWT_SECRET = process.env.ACCESS_TOKEN_SECRET || "";
export interface AuthenticatedUser {
  id: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

export const authMiddleware = asyncHandler(

  async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {

    const token = req.cookies?.accessToken;

    if (!token) {
      throw new AppError(401, "Unauthorized access - No token provided");
    }

    try {

      const decodedToken = jwt.verify(token, JWT_SECRET) as { id: string };
      req.user = { id: decodedToken.id };
      next();
    } catch (error: unknown) {

      if (error instanceof AppError) throw error;
      throw new AppError(401, "Unauthorized access - Invalid or expired token");
    }

  },
);
