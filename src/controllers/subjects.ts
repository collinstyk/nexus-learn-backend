import type { NextFunction, Request, Response } from "express";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import prisma from "../prisma.js";

export const createSubject = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, topics, description } = req.body;

    if (!name) return next(new AppError("Subject requires a name!", 400));

    const topicArray = Array.isArray(topics) ? topics : [];
    const uniqueInputNames = [
      ...new Set(topicArray.map((t) => t.name).filter(Boolean)),
    ];

    const result = await prisma.$transaction(async (tx) => {
      // Single query look-ahead to find existing topics
      const existingTopics = await tx.topic.findMany({
        where: { name: { in: uniqueInputNames } },
        select: { id: true, name: true, description: true },
      });

      const existingNames = existingTopics.map((t) => t.name);

      // Filter out topics that don't exist yet so we can batch-create them
      const newTopicsToCreate = topicArray.filter(
        (t) => t.name && !existingNames.includes(t.name),
      );

      // Batch create only the genuinely new topics in one transaction step
      if (newTopicsToCreate.length > 0) {
        await tx.topic.createMany({
          data: newTopicsToCreate.map((t) => ({
            name: t.name,
            description: t.description || null,
          })),
          skipDuplicates: true, // Secondary perimeter safety lock
        });
      }

      // Re-fetch or fetch all targeted topics to collect their generated database UUID keys
      const allTargetTopics = await tx.topic.findMany({
        where: { name: { in: uniqueInputNames } },
        select: { id: true, name: true, description: true },
      });

      const newSubject = await tx.subject.create({
        data: {
          name,
          description,
          isApproved: false,
          topics: {
            connect: allTargetTopics.map(t => ({id: t.id}))
          }
        },
        include: {
            topics: true
        }
      });

      return newSubject;
    });
    // TODO: Alert the admin that a subject is waiting for approval

    res.status(201).json({
      data: result,
    });
  },
);

/**
 * DISCOVERY ENGINE: Get all approved disciplines for content assignment selectors
 */
export const getAllActiveSubjects = catchAsync(async (req: Request, res: Response) => {
  const subjects = await prisma.subject.findMany({
    where: { isApproved: true },
    include: {
      topics: {
        select: { id: true, name: true }
      }
    },
    orderBy: { name: "asc" }
  });

  return res.status(200).json({
    status: "success",
    data: { subjects }
  });
});
