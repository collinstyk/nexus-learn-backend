import type { Request, Response, NextFunction } from "express";
import prisma from "../prisma.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";

/**
 * ResourceAccessGuard
 * Restricts access to course materials based on student enrollment 
 * and individual resource 'Free Preview' flags.
 */
export const authorizeCourseAccess = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const currentUserId = req.user?.id;
  const { courseId } = req.params as { courseId: string };
  const resourceId = (req.query.resourceId || req.params.id) as string; // Support query or param lookups

  if (!currentUserId) {
    return next(new AppError("Unauthorized. Please log in to continue.", 401));
  }

  // 1. Check for an active Enrollment record
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId: currentUserId,
        courseId: courseId,
      },
    },
  });

  // 🔓 Enrollment bypass: If found, attach to request context and proceed
  if (enrollment) {
    req.enrollment = enrollment;
    return next();
  }

  // 🛡️ Free Preview Check: If not enrolled, allow access ONLY if the specific resource is free
  if (resourceId) {
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      select: { isFreePreview: true, courseId: true }
    });

    if (resource && resource.courseId === courseId && resource.isFreePreview) {
      return next(); 
    }

    return next(new AppError("Access Denied. Enrollment required for premium content.", 403));
  }

  // Allow listing routes to pass through so metadata masking logic can run in the controller
  next();
});