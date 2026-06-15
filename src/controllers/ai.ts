import type { NextFunction, Request, Response } from "express";
import prisma from "../prisma.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";

/**
 * Commits an AI-generated structured curriculum path to the database
 */
export const createLearningRoadmap = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  // Extract student context from verified token middleware
  const { id: userId } = req.user as { id: string };
  
  // Destructure the AI-generated curriculum data along with the optional scope targets
  const { title, description, steps, subjectId, topicId, courseId } = req.body;

  // --- TRIAGE PLACEMENT GUARDS ---
  // Ensure the AI pipeline targets at least one valid organizational layer
  if (!subjectId && !topicId && !courseId) {
    return next(new AppError("Bad Request: A learning roadmap must be anchored to a Subject, Topic, or Course.", 400))
  }

  // Prevent alignment overlaps (A roadmap can only have one explicit structural parent anchor)
  const anchorCount = [subjectId, topicId, courseId].filter(Boolean).length;
  if (anchorCount > 1) {
    return res.status(400).json({
      status: "fail",
      message: "Bad Request: Ambiguous scope. Roadmap cannot be pinned to multiple parent entities simultaneously."
    });
  }

  const newRoadmap = await prisma.learningRoadmap.create({
    data: {
      title,
      description,
      userId,
      steps, // High-intensity AI JSON block structure
      subjectId: subjectId || null,
      topicId: topicId || null,
      courseId: courseId || null,
    },
    // Include the parent metadata tracking objects based on what was provided
    include: {
      subject: { select: { id: true, name: true } },
      topic: { select: { id: true, name: true } },
      course: { select: { id: true, title: true, code: true } }
    }
  });

  return res.status(201).json({
    status: "success",
    data: {
      roadmap: newRoadmap
    }
  });
});

/**
 * Analyze user metrics and generate a personalized AI learning roadmap
 */
export const getAILearningRoadmap = catchAsync(async (req: Request, res: Response) => {
  const currentUserId = req.user?.id as string;
  const { subjectId } = req.query as { subjectId?: string };

  if (!subjectId) {
    return res.status(400).json({ status: "fail", message: "Please specify a Subject ID for the AI to analyze." });
  }

  // A. Find all topic IDs linked under this broad subject umbrella
  const associatedTopics = await prisma.topic.findMany({
    where: { subjects: { some: { id: subjectId } } },
    select: { id: true, courses: { select: { id: true } } }
  });

  const topicIds = associatedTopics.map((t: any) => t.id);
  
  // B. Flatten and gather all course IDs connected to those topics
  const courseIds = associatedTopics.flatMap((t: any) => t.courses.map((c: any) => c.id));

  // C. Fetch polymorphic activity logs across all three axes for the user
  const logs = await prisma.activityLog.findMany({
    where: { 
      userId: currentUserId,
      OR: [
        { subjectId: subjectId },               // Explicit subject log (like a global exam)
        { metadata: { in: topicIds } },         // Topic logs (if you log topic ID inside metadata string)
        { metadata: { in: courseIds } }         // Course logs (if you log course ID inside metadata string)
        // Note: If you choose to add explicit topicId/courseId columns to ActivityLog in the future,
        // you would simply replace the metadata fields above with: { topicId: { in: topicIds } }, etc.
      ]
    },
    select: { score: true, durationSeconds: true }
  });


  const quizLogs = logs.filter((l: any) => l.score !== null);
  const avgScore = quizLogs.length > 0 ? quizLogs.reduce((acc: number, curr: any) => acc + (curr.score || 0), 0) / quizLogs.length : 70; 
  const totalMinutes = Math.round(logs.reduce((acc: number, curr: any) => acc + curr.durationSeconds, 0) / 60);

  let recommendations: string[] = [];
  let currentFocusZone = "Core Concepts";
  let estimatedCompletionDays = 14;

  if (avgScore >= 85) {
    currentFocusZone = "High-Level Architecture & Peer Mentorship";
    estimatedCompletionDays = 7;
    recommendations = [
      "Review edge-case optimization mechanics in the Digital Library.",
      "Launch a PvP Knowledge Battle against top-tier peers to lock in core memory structures.",
      "Author an insightful Forum Post summarizing advanced concepts for extra peer points."
    ];
  } else if (avgScore >= 50 && avgScore < 85) {
    currentFocusZone = "Practical Skill Solidification";
    estimatedCompletionDays = 10;
    recommendations = [
      "Take the modular CBT review quizzes to strengthen mid-tier accuracy gaps.",
      "Engage in targeted study forum threads to read peer explanations on tough concepts.",
      "Review the core module documentation materials inside the Library repository."
    ];
  } else {
    currentFocusZone = "Foundational Recovery & Root Re-learning";
    estimatedCompletionDays = 21;
    recommendations = [
      "Re-open Introductory Course syllabus paths and download foundational summary sheets.",
      "Halt PvP matchups temporarily and prioritize untimed CBT question drills.",
      "Post a direct question in the Forum Hub using the 'Struggling with Fundamentals' help tag."
    ];
  }

  res.status(200).json({
    status: "success",
    data: {
      analysis: {
        analyzedLogsCount: logs.length,
        detectedAverageGrade: Math.round(avgScore),
        totalTimeInvestedMinutes: totalMinutes,
      },
      aiRoadmap: {
        subjectId,
        curriculumTrack: avgScore >= 85 ? "Advanced Mastery Track" : avgScore >= 50 ? "Standard Progression Track" : "Foundational Recovery Track",
        currentFocusZone,
        estimatedCompletionDays,
        personalizedSteps: recommendations,
        generatedAt: new Date()
      }
    }
  });
});