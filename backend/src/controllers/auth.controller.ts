import { Request, Response, CookieOptions } from "express";
import { registerUser, loginUser, logOut, refreshAccessTokenService } from "../services/auth.service";
import { ApiResponse } from "../utils/api-response";
import { asyncHandler } from "../utils/async-handler";
import logger from "../utils/logger";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";

//profile image as input upload to cloudinary 

const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: false, // for local development
  sameSite: "lax",
};

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  await registerUser(name, email, password);

  res.status(201).json(new ApiResponse(201, null, "User registered successfully"));
});

//cookies (access and refresh token)
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const result = await loginUser(email, password);
  const accessToken = result.accessToken;
  const refreshToken = result.refreshToken;

  res.cookie("accessToken", accessToken, cookieOptions);
  res.cookie("refreshToken", refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7 days

  res.status(200).json(new ApiResponse(200, result.userData, "Login successful"));
});

export const logout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (req.user) {
    await logOut(req.user.id);
    logger.info(`User with ID ${req.user.id} logged out successfully`);
  }

  res.clearCookie("accessToken", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Logout successful"));
});

export const refreshTokens = asyncHandler(async (req: Request, res: Response) => {
  const incomingRefreshToken = req.cookies?.refreshToken;

  if (!incomingRefreshToken) {
    res.status(401).json(new ApiResponse(401, null, "Unauthorized - No refresh token"));
    return;
  }

  const { accessToken, refreshToken } = await refreshAccessTokenService(incomingRefreshToken);

  res.cookie("accessToken", accessToken, cookieOptions);
  res.cookie("refreshToken", refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7 days

  res.status(200).json(new ApiResponse(200, null, "Tokens refreshed successfully"));
});
