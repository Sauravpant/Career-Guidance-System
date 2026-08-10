import { prisma } from "../configs/db";
import bcrypt from "bcrypt";
import type {
  RegistrationResponse,
  LoginResponse,
  ResetPasswordData,
} from "../types/auth.types";
import { AppError } from "../utils/app-error";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/token";
import type { User } from "@prisma/client";

export const registerUser = async (
  name: string,
  email: string,
  password: string,
): Promise<RegistrationResponse> => {

  const userExists = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (userExists) {
    throw new AppError(409, "User already exists with this email");
  }

  const hashedPassword = await bcrypt.hash(password, 8);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      experience: null,
      education: null,
      skills: [],
      avatarUrl: null,
      bannerUrl: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      experience: true,
      education: true,
      skills: true,
      avatarUrl: true,
      bannerUrl: true,
      createdAt: true,
    },
  });

  return { userData: user as any };
};

export const loginUser = async (
  email: string,
  password: string,
): Promise<LoginResponse> => {

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      password: true,
      experience: true,
      education: true,
      skills: true,
      avatarUrl: true,
      bannerUrl: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new AppError(401, "Invalid email or password");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new AppError(401, "Invalid email or password");
  }

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);
  // (fire-and-forget pattern — we await it before returning, but
  //  the DB write overlaps with any remaining synchronous work)

  const updatePromise = prisma.user.update({
    where: { id: user.id },
    data: { refreshToken },
    select: { id: true },
  });

  const { password: _pw, ...userData } = user;
  // Await the DB update before sending the response so the cookie is consistent
  await updatePromise;

  return { accessToken, refreshToken, userData: userData as any };
};

export const logOut = async (userId: string): Promise<void> => {
  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      refreshToken: null,
    },
  });
};

export const resetPassword = async (
  data: ResetPasswordData,
): Promise<Omit<User, "password">> => {

  const user = await prisma.user.findUnique({
    where: {
      email: data.email,
    },
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  const isMatch = await bcrypt.compare(data.oldPassword, user.password);

  if (!isMatch) {
    throw new AppError(401, "Old password is incorrect");
  }

  const hashedPassword = await bcrypt.hash(data.newPassword, 8);
  const updatedUser = await prisma.user.update({
    where: {
      email: data.email,
    },
    data: {
      password: hashedPassword,
      refreshToken: null,
    },
  });

  const { password, ...userData } = updatedUser;

  return {
    ...userData,
  };
};

export const refreshAccessTokenService = async (
  incomingRefreshToken: string,
) => {
  try {

    const decodedToken = verifyRefreshToken(incomingRefreshToken) as {
      id: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: decodedToken.id },
    });

    if (!user) {
      throw new AppError(401, "Invalid refresh token - User not found");
    }

    if (incomingRefreshToken !== user.refreshToken) {
      throw new AppError(401, "Refresh token is expired or used");
    }

    const accessToken = generateAccessToken(user.id);
    const newRefreshToken = generateRefreshToken(user.id);
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newRefreshToken },
    });

    return { accessToken, refreshToken: newRefreshToken };
  } catch {
    throw new AppError(401, "Invalid or expired refresh token");
  }

};
