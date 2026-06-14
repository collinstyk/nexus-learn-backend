import type { NextFunction, Request, Response } from "express";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import prisma from "../prisma.js";

/**
 * CMS/ADMIN ENGINE: Create a standalone Topic and link it to parent Subjects
 */
export const createTopic = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { name, description, subjectIds } = req.body;

  if (!name) {
    return next(new AppError("Bad Request: Topic requires a unique name configuration.", 400));
  }

  const subjectIdArray = Array.isArray(subjectIds) ? subjectIds : [];
  if (subjectIdArray.length === 0) {
    return next(new AppError("Bad Request: A topic must be bound to at least one parent Subject ID.", 400));
  }

  // Validate that the targeted parent subjects actually exist before executing relation links
  const existingSubjectsCount = await prisma.subject.count({
    where: { id: { in: subjectIdArray } }
  });

  if (existingSubjectsCount !== subjectIdArray.length) {
    return next(new AppError("Not Found: One or more provided parent Subject IDs do not exist in the database.", 404));
  }

  // Instantiate the Topic and seamlessly wire the implicit many-to-many lookup table
  const newTopic = await prisma.topic.create({
    data: {
      name,
      description: description || null,
      subjects: {
        connect: subjectIdArray.map((id: string) => ({ id }))
      }
    },
    include: {
      subjects: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  return res.status(201).json({
    status: "success",
    message: "Topic created and mapped to targeted subjects successfully.",
    data: { topic: newTopic }
  });
});