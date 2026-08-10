import axios from "axios";
import prisma from "../configs/db";
import { AppError } from "../utils/app-error";

const ML_RECOMMEND_URL =
  process.env.ML_RECOMMEND_URL || "http://localhost:8000/api/v1/recommend";

class RecommendationService {

  async getRecommendation(userId: string) {

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, "User not found");
    }

    const userSkills = user.skills || [];
    const userExp = user.experience ?? 0;

    if (userSkills.length === 0) {
      throw new AppError(
        400,
        "Please add skills to your profile first before calculating a career recommendation.",
      );
    }

    try {
      console.log(
        `Sending request to ML service with skills: ${userSkills} and experience: ${userExp}`,
      );

      const response = await axios.post(ML_RECOMMEND_URL, {
        skills: userSkills,
        experience: Number(userExp),
      });

      const { best_career, confidence, top_3_recommendations } = response.data;
      const recommendation = await prisma.recommendation.create({
        data: {
          userId,
          bestCareer: best_career,
          confidence: Number(confidence),
          top3: top_3_recommendations,
        },
      });

      return recommendation;
    } catch (error: any) {
      console.error(
        "Error communicating with ML recommendation service:",
        error.message,
      );
      throw new AppError(
        error.response?.status || 500,
        error.response?.data?.detail ||
          "ML service recommendation error. Ensure the FastAPI service is running.",
      );
    }
  }

  async getRecommendationHistory(userId: string) {

    return prisma.recommendation.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async exploreCareers(skills: string[], experience: number) {

    if (!skills || skills.length === 0) {
      throw new AppError(400, "Please provide skills to explore careers.");
    }

    try {
      console.log(
        `Sending request to ML service with skills: ${skills} and experience: ${experience}`,
      );

      const response = await axios.post(ML_RECOMMEND_URL, {
        skills: skills,
        experience: Number(experience || 0),
      });

      return {
        bestCareer: response.data.best_career,
        confidence: Number(response.data.confidence),
        top3: response.data.top_3_recommendations,
      };
    } catch (error: any) {
      console.error(
        "Error communicating with ML recommendation service:",
        error.message,
      );
      throw new AppError(
        error.response?.status || 500,
        error.response?.data?.detail ||
          "ML service recommendation error. Ensure the FastAPI service is running.",
      );
    }
  }
}

export default new RecommendationService();
