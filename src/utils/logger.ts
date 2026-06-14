import { ActivityType } from "../generated/prisma/enums.js";
import prisma from "../prisma.js";
import catchAsync from "./catchAsync.js";
import type { Request, Response } from "express";

// Define explicit types for our platform activity actions
export type ActivityActionType = 
  | "RESOURCE_VIEW" 
  | "POST_CREATED" 
  | "COMMENT_CREATED" 
  | "QUIZ_COMPLETED" 
  | "PVP_MATCH_WON";

  const actionToEnumMap: Record<ActivityActionType, ActivityType> = {
  RESOURCE_VIEW: ActivityType.RESOURCE_VIEW,
  POST_CREATED: ActivityType.FORUM_POST,
  COMMENT_CREATED: ActivityType.FORUM_POST,
  QUIZ_COMPLETED: ActivityType.CBT,
  PVP_MATCH_WON: ActivityType.PVP,
};

  interface LogOptions {
  subjectId?: string;
  metadata?: Record<string, any>;
  score?: number;
  durationSeconds?: number;
}

/**
 * 📝 Reusable utility to drop records into the Global Activity Ledger
 */
export async function logUserActivity(userId: string, action: ActivityActionType, options?: LogOptions) {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        activityType: actionToEnumMap[action],
        action,
        subjectId: options?.subjectId || null,
        score: options?.score || null,
        metadata: options?.metadata ? JSON.stringify(options.metadata) : null,
      },
    });
  } catch (error) {
    // Fail-silent logging so a telemetry crash never interrupts a user's core experience
    console.error(`🚨 [Telemetry Failure] Failed to record activity for user ${userId}:`, error);
  }
}

/**
 * Calculate the student's active daily study streak and overall metrics
 */
export const getUserPerformanceMetrics = catchAsync(async (req: Request, res: Response) => {
  const currentUserId = req.user?.id as string;

  // 1. Fetch the unique dates of the user's activity logs, sorted newest first
  const logs = await prisma.activityLog.findMany({
    where: { userId: currentUserId },
    select: { createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  // 2. STREAK MATHEMATICS ENGINE
  let currentStreak = 0;
  
  if (logs.length > 0) {
    // Normalize timestamps to midnight of the user's local day boundary to avoid hour discrepancies
    const uniqueDays = Array.from(
      new Set(logs.map((log: any) => new Date(log.createdAt).toDateString()))
    ).map((dateStr: any) => new Date(dateStr));

    const today = new Date(new Date().toDateString());
    const yesterday = new Date(new Date().toDateString());
    yesterday.setDate(yesterday.getDate() - 1);

    const newestLogDate = uniqueDays[0];

    // Check if the student has studied either today or yesterday. If not, the streak has broken.
    if (newestLogDate?.getTime() === today.getTime() || newestLogDate?.getTime() === yesterday.getTime()) {
      currentStreak = 1; // Start counting from the most recent active day
      
      // Look back chronologically day-by-day to count the consecutive chain
      for (let i = 0; i < uniqueDays.length - 1; i++) {
        const currentDay = uniqueDays[i];
        const priorDay = uniqueDays[i + 1];

        // Calculate time delta between consecutive logs
        const diffTime = (currentDay?.getTime() ?? 0) - (priorDay?.getTime() ?? 0);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          currentStreak++; // Chain intact!
        } else if (diffDays > 1) {
          break; // Chain broken by a gap day. Stop tracking.
        }
      }
    }
  }

  // 3. PERFORMANCE AGGREGATION ENGINE (Leveraging your top-level columns!)
  const performanceTotals = await prisma.activityLog.aggregate({
    where: { userId: currentUserId },
    _sum: {
      durationSeconds: true,
    },
    _avg: {
      score: true,
    },
  });

  res.status(200).json({
    status: "success",
    data: {
      streak: currentStreak,
      totalStudyTimeMinutes: Math.round((performanceTotals._sum.durationSeconds || 0) / 60),
      averageQuizScore: Math.round(performanceTotals._avg.score || 0),
    },
  });
});