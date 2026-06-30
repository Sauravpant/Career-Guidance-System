import axios from "axios";
import { AppError } from "../utils/app-error";

const ML_ROADMAP_API = process.env.ROADMAP_API_URL!;

export const fetchRoadmapFromML = async (userId: string) => {
  try {
    const response = await axios.post(ML_ROADMAP_API, {
      userId,
    });

    return response.data;
  } catch (error: any) {
    throw new AppError(
      error?.response?.status || 500,
      error?.response?.data?.message || "Failed to fetch roadmap"
    );
  }
};