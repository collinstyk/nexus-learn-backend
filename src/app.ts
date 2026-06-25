import express from "express";
import type { Express } from "express";
import cors from "cors";
import morgan from "morgan";

import authRouter from "./routes/auth.js";
import chatRouter from "./routes/chat.js";
import subjectRouter from "./routes/subjects.js";
import topicRouter from "./routes/topic.js";
import courseRouter from "./routes/course.js";
import enrollmentRouter from "./routes/enrollment.js";
import forumRouter from "./routes/forum.js";
import analyticsRouter from "./routes/analytics.js";
import aiRouter from "./routes/ai.js";
import quizRouter from "./routes/quiz.js";

const app: Express = express();

app.use(cors({
    origin: ["http://localhost:5173", "https://nexus-learn-frontend.vercel.app"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
}))

app.use(express.json());

app.use(morgan("dev"));

// routes
app.use("/api/v1/auth", authRouter)
app.use("/api/v1/chat", chatRouter);
app.use("/api/v1/subjects", subjectRouter);
app.use("/api/v1/topics", topicRouter);
app.use("/api/v1/courses", courseRouter);
app.use("/api/v1/enrollment", enrollmentRouter);
app.use("/api/v1/forum", forumRouter);
app.use("/api/v1/analytics", analyticsRouter);
app.use("/api/v1/ai", aiRouter);
app.use("/api/v1/quiz", quizRouter);
// app.use("/api/v1/cms")

export default app;
