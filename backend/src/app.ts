import express from "express";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import roadmapRoutes from "./routes/roadmap.routes";
import { errorMiddleware } from "./middlewares/error.middleware";

const app = express();
app.disable("x-powered-by");

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/auth", authRoutes);
app.use("/user", userRoutes);
app.use("/roadmap", roadmapRoutes);

// Global error handler (must be last)
app.use(errorMiddleware);

export default app;