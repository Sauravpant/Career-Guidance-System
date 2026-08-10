import type { User } from "../generated/prisma";
export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegistrationResponse {
  userData: Omit<User, "password">;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  userData: Omit<User, "password">;
}

export interface ResetPasswordData {
  email: string;
  oldPassword: string;
  newPassword: string;
}
