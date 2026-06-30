import type { User } from "../generated/prisma";
//Type Defination for Registration data
export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

//Type Defination for Login data
export interface LoginData {
  email: string;
  password: string;
}
//Type Defination for Registration  Response
export interface RegistrationResponse {
  userData: Omit<User, "password">;
}

//Type Defination for Login Response
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