import api from "./api";
import type {
  LoginCredentials,
  RegisterCredentials,
  UserProfile,
} from "../types/index";

export const authService = {
  async login(credentials: LoginCredentials): Promise<UserProfile> {
    const response = await api.post("/auth/login", credentials);
    return response.data.data;
  },

  async register(credentials: RegisterCredentials): Promise<void> {
    const response = await api.post("/auth/register", credentials);
    return response.data.data;
  },

  async logout(): Promise<void> {
    const response = await api.post("/auth/logout");
    return response.data.data;
  },

  async refresh(): Promise<void> {
    await api.post("/auth/refresh");
  },
};
