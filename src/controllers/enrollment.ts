import type { Request, Response, NextFunction } from "express";
import prisma from "../prisma.js";
import catchAsync  from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";

/**
 * Core Student Enrollment Handler
 * Registers a student profile to an active course curriculum node
 */
export const enrollInCourse = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id: userId } = req.user as { id: string };
  const { courseId } = req.body;

  if (!courseId) {
    return next(new AppError("Please provide a valid Course ID to complete enrollment.", 400));
  }

  // 1. Defuse Double Enrollment Duplication Trap
  const existingEnrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: { userId, courseId }
    }
  });

  if (existingEnrollment) {
    return res.status(200).json({
      status: "success",
      message: "Student is already actively enrolled in this course.",
      data: { enrollment: existingEnrollment }
    });
  }

  // 2. Commit the Dynamic Composite Record
  const newEnrollment = await prisma.enrollment.create({
    data: {
      userId,   // 🎯 Links flawlessly into our newly repaired User back-reference pair
      courseId, // Links directly into Course table
      paymentStatus: "FREE" // Default fallback string matching your schema enum
    },
    include: {
      course: {
        select: { title: true, code: true }
      }
    }
  });

  console.log(`📡 [Enrollment Secured] User ${userId} successfully registered for Course: ${courseId}`);

  return res.status(201).json({
    status: "success",
    message: "Successfully enrolled in course.",
    data: { enrollment: newEnrollment }
  });
});