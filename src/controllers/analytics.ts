import type { Request, Response } from "express";
import prisma from "../prisma.js";
import catchAsync from "../utils/catchAsync.js";

/**
 * Fetch the logged-in student's historical activity timeline
 */
export const getActivityLedger = catchAsync(async (req: Request, res: Response) => {
  const currentUserId = req.user?.id as string;
  const limit = parseInt(req.query.limit as string) || 10;

  const logs = await prisma.activityLog.findMany({
    where: { userId: currentUserId },
    take: limit,
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json({
    status: "success",
    results: logs.length,
    data: { 
      // Parse metadata strings back to JSON objects dynamically for the UI frontend
      logs: logs.map((log: any) => ({
        ...log,
        metadata: log.metadata ? JSON.parse(log.metadata) : null
      }))
    },
  });
});