import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";

import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import roadmapRoutes from "./routes/roadmap.routes";
import projectRoutes from "./routes/project.routes";
import resourceRoutes from "./routes/resource.routes";
import skillGapRoutes from "./routes/skill-gap.routes";
import weeklyGoalRoutes from "./routes/weekly-goal.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import { errorMiddleware } from "./middlewares/error.middleware";

const app = express();
app.disable("x-powered-by");

// Security headers
app.use(helmet());

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true, // allow cookies to be sent cross-origin
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/roadmaps", roadmapRoutes);
app.use("/api/v1/projects", projectRoutes);
app.use("/api/v1/resources", resourceRoutes);
app.use("/api/v1/skill-gaps", skillGapRoutes);
app.use("/api/v1/weekly-goals", weeklyGoalRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);

app.use(errorMiddleware);

export default app;
