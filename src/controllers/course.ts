import type { NextFunction, Request, Response } from "express";
import prisma from "../prisma.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import { logUserActivity } from "../utils/logger.js";
import type { ResourceType } from "../generated/prisma/enums.js";

/**
 * Create a course, More to add i.e Videos, Files e.t.c
 */
export const createCourse = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id: userId } = req.user as { id: string; name: string };

    // Find or Verify user's TutoProfile ID
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId },
    });

    if (!tutorProfile)
      return next(
        new AppError("Forbidden: Only tutors can build courses.", 403),
      );

    // Destructure incoming payload properties including the new topicIds array matrix
    const { title, description, code, topicIds, isFree, price } = req.body;

    if (!topicIds || !Array.isArray(topicIds) || topicIds.length === 0) {
      return next(
        new AppError(
          "Bad Request: A course must be tagged with at least one target Topic ID.",
          400,
        ),
      );
    }

    // --- DATABASE MUTATION ---
    const newCourse = await prisma.course.create({
      data: {
        title,
        description,
        code,
        tutorProfileId: tutorProfile.id,
        isFree: isFree ?? true,
        price: price ?? 0.0,
        // Connect to one or more pre-existing Topic IDs via standard Prisma many-to-many relational linking
        topics: {
          connect: topicIds.map((id: string) => ({ id })),
        },
      },
      // Include the topics back in the response so the frontend can immediately render the structural pills
      include: {
        topics: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    console.log(
      `Course Deployed! Successfully instantiated Course: "${title}" (${code}) by Tutor: ${tutorProfile.id}`,
    );

    // ---  STREAM RESPONSE REWARDS ---
    return res.status(201).json({
      status: "success",
      message: "Course created successfully.",
      data: {
        course: newCourse,
      },
    });
  },
);

/**
 * CMS ENGINE: Update course metadata and publication status
 */
export const updateCourse = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id: userId } = req.user as { id: string };
    const { id: courseId } = req.params as { id: string | undefined };
    const { title, description, code, topicIds, isFree, isPublished, price } =
      req.body;

    // 1. Verify Tutor Identity
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId },
    });

    if (!tutorProfile)
      return next(
        new AppError("Forbidden: Only tutors can manage courses.", 403),
      );

    // 2. Ownership Check
    const course = await prisma.course.findUnique({ where: { id: courseId } });

    if (!course)
      return next(new AppError("Not Found: Target course missing.", 404));

    if (course.tutorProfileId !== tutorProfile.id)
      return next(
        new AppError(
          "Forbidden: You do not have authority over this course.",
          403,
        ),
      );

    // 3. Execution Patch
    const updatedCourse = await prisma.course.update({
      where: { id: courseId },
      data: {
        title,
        description,
        code,
        isFree,
        isPublished,
        price,
        ...(topicIds &&
          Array.isArray(topicIds) && {
            topics: {
              set: topicIds.map((topicId: string) => ({ id: topicId })),
            },
          }),
      },
      include: {
        topics: {
          select: { id: true, name: true },
        },
      },
    });

    return res.status(200).json({
      status: "success",
      message: "Course metadata synchronized successfully.",
      data: { course: updatedCourse },
    });
  },
);

/**
 * CMS ENGINE: Permanently purge a course and its associated data
 */
export const deleteCourse = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id: userId } = req.user as { id: string };
    const { courseId } = req.params as { courseId : string };

    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId },
    });
    if (!tutorProfile)
      return next(new AppError("Forbidden: Tutor clearance required.", 403));

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course)
      return next(new AppError("Not Found: Target course missing.", 404));

    if (course.tutorProfileId !== tutorProfile.id)
      return next(
        new AppError("Forbidden: Unauthorized deletion attempt.", 403),
      );

    await prisma.course.delete({ where: { id: courseId } });

    return res.status(200).json({
      status: "success",
      message: "Course has been successfully purged from the library.",
    });
  },
);

/**
 * CMS ENGINE: Initialize a module shell slot inside a specific course
 */
export const createModule = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // 1. Destructure parameter metrics directly from the incoming body payload
    const { courseId } = req.params as { courseId: string };
    const { title, order } = req.body;

    // 2. Validate mandatory perimeter arguments are alive and healthy
    if (!courseId || !title || order === undefined) {
      return next(
        new AppError(
          "Bad Request: Please provide a target courseId, a title, and an explicit order sorting integer.",
          400,
        ),
      );
    }

    // 3. Prevent structural orphaned elements by verifying the parent Course actually exists
    const parentCourse = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!parentCourse) {
      return next(
        new AppError(
          "Not Found: The parent Course ID provided does not match any records in the database.",
          404,
        ),
      );
    }

    // 4. Fire the transaction layer mutation to instantiate the Module row matrix
    const newModule = await prisma.module.create({
      data: {
        courseId,
        title,
        order: Number(order), // Explicitly parse to prevent type enforcement crashes from string conversions
      },
    });

    console.log(
      `[CMS Update]: Module structure "${title}" deployed cleanly to Course: ${courseId} at Sort Order Position: ${order}`,
    );

    // 5. Stream the resulting entity back down the wire
    return res.status(201).json({
      status: "success",
      message: "Module section shell initialized successfully.",
      data: {
        module: newModule,
      },
    });
  },
);

/**
 * Initialize a resource shell slot inside a module course
 */
export const createCourseResource = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { moduleId, title, type } = req.body as {
      moduleId: string;
      title: string;
      type: ResourceType;
    };

    const { courseId } = req.params as { courseId: string };

    // Validate that mandatory parameters are alive in the payload
    if (!moduleId || !title || !type) {
      return next(
        new AppError(
          "Bad Request: Please provide a target moduleId, title, and valid ResourceType enum value.",
          400,
        ),
      );
    }

    // 2. Ensure the parent module actually exists before inserting a floating leaf node
    const parentModule = await prisma.module.findUnique({
      where: { id: moduleId },
    });

    if (!parentModule) {
      return next(
        new AppError(
          "Not Found: The target Module ID provided does not exist.",
          404,
        ),
      );
    }

    // 3. Create the empty or structured resource row element
    const newResource = await prisma.resource.create({
      data: {
        courseId,
        moduleId,
        title,
        type,
        isFreePreview: false,
      },
    });

    return res.status(201).json({
      status: "success",
      message: "Resource slot initialized successfully.",
      data: { resource: newResource },
    });
  },
);

/**
 * The Background Autosave / Update Router Terminal
 */
export const updateResource = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { resourceId } = req.params as { resourceId: string };
    const { title, fileUrl, content, isFreePreview } = req.body;

    // 1. Verify target resource exists before attempting data mutation
    const existingResource = await prisma.resource.findUnique({
      where: { id: resourceId },
    });

    if (!existingResource) {
      return next(
        new AppError(
          "Not Found: Target resource asset could not be located.",
          404,
        ),
      );
    }

    // 2. Perform the atomic patch operation update
    const updatedResource = await prisma.resource.update({
      where: { id: resourceId },
      data: {
        title: title ?? existingResource.title,
        // If a parameter is explicitly passed as null/undefined, handle it gracefully
        fileUrl: fileUrl !== undefined ? fileUrl : existingResource.fileUrl,
        content: content !== undefined ? content : existingResource.content,
        isFreePreview: isFreePreview ?? existingResource.isFreePreview,
      },
    });

    return res.status(200).json({
      status: "success",
      message: "Resource progress synchronized and cached successfully.",
      data: { resource: updatedResource },
    });
  },
);

/**
 * Fetch all available courses with optional search filtering
 */
export const getCourses = catchAsync(async (req: Request, res: Response) => {
  const search = (req.query.search as string) || "";

  const courses = await prisma.course.findMany({
    where: {
      isPublished: true, // Only display courses that have been explicitly published
      OR: [
        // 1. Search directly against Course properties
        { title: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },

        // 2. Traversal Search: Check if any linked TOPIC matches the search term
        {
          topics: {
            some: {
              name: { contains: search, mode: "insensitive" },
            },
          },
        },

        // 3. Traversal Search: Check if any linked SUBJECT matches the search term
        {
          topics: {
            some: {
              subjects: {
                some: {
                  name: { contains: search, mode: "insensitive" },
                },
              },
            },
          },
        },
      ],
    },
    // Include topics and their parent subjects so the UI can render search category tags!
    include: {
      topics: {
        include: {
          subjects: true,
        },
      },
    },
    orderBy: { code: "asc" },
  });

  res.status(200).json({
    status: "success",
    results: courses.length,
    data: { courses },
  });
});

/**
 * LMS ENGINE: Fetch complete nested course layout tree
 */
export const getCourseSyllabus = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { courseId } = req.params as { courseId: string };

    const courseSyllabus = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          orderBy: { order: "asc" }, // 🎯 Ensures Module 1 is always above Module 2
          include: {
            resources: {
              orderBy: { createdAt: "asc" }, // Keeps lessons ordered by entry date
              select: {
                id: true,
                title: true,
                type: true,
                isFreePreview: true,
                // We omit the heavy Markdown 'content' payload here to keep the navigation sidebar ultra-lightweight!
              },
            },
          },
        },
      },
    });

    if (!courseSyllabus) {
      return next(
        new AppError("Not Found: Target course could not be located.", 404),
      );
    }

    return res.status(200).json({
      status: "success",
      data: { syllabus: courseSyllabus },
    });
  },
);

/**
 * Fetch all study documents/resources mapped to a specific course
 */
export const getCourseResources = catchAsync(
  async (req: Request, res: Response) => {
    const currentUserId = req.user?.id;
    const { courseId } = req.params as { courseId: string };
    const enrollment = req.enrollment;

    // 1. Fetch all resources so the user can see the structure
    const resources = await prisma.resource.findMany({
      where: { courseId: courseId },
      orderBy: { createdAt: "desc" },
    });

    // 2. Map and mask content based on enrollment status
    const dynamicResources = resources.map((resource: any) => {
      const hasAccess = enrollment || resource.isFreePreview;

      return {
        id: resource.id,
        title: resource.title,
        type: resource.type,
        isFreePreview: resource.isFreePreview,
        isLocked: !hasAccess,
        fileUrl: hasAccess ? resource.fileUrl : null,
      };
    });

    // TELEMENTRY HOOK: Log that this student audited this specific library node
    if (currentUserId && resources.length > 0) {
      const firstResource = resources[0];

      await logUserActivity(currentUserId, "RESOURCE_VIEW", {
        metadata: { courseId, resourceId: firstResource?.id },
      });
    }

    res.status(200).json({
      status: "success",
      results: dynamicResources.length,
      data: { resources: dynamicResources },
    });
  },
);

/**
 * LMS ENGINE: Stream standalone lesson media/markdown asset data
 * GET /api/v1/resources/:id
 */
export const getSingleCourseResource = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { resourceId } = req.params as { resourceId: string };
    const currentUserId = req.user?.id;

    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      include: {
        module: {
          select: { courseId: true },
        },
      },
    });

    if (!resource) {
      return next(
        new AppError(
          "Not Found: The target lesson resource does not exist.",
          404,
        ),
      );
    }

    // TODO: Add an optional check here to ensure the student is actually enrolled in resource.module.courseId if the asset is not an open free preview!

    // TELEMETRY HOOK: Log user interaction metrics for the AI Learning Roadmap Engine
    if (currentUserId) {
      await prisma.activityLog.create({
        data: {
          userId: currentUserId,
          activityType: "RESOURCE_VIEW",
          action: `Viewed Asset Lesson: ${resource.title}`,
          metadata: JSON.stringify({
            resourceId: resource.id,
            type: resource.type,
          }),
        },
      });
    }

    return res.status(200).json({
      status: "success",
      data: { resource },
    });
  },
);
