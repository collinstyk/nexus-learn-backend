import type { Request, Response, NextFunction } from "express";
import prisma from "../prisma.js";
import AppError from "../utils/appError.js";

/**
 * Strict HTTP Middleware Gatekeeper: Assures the requesting user
 * actually has a membership relation inside the target Room ID.
 */
export const authorizeRoomAccess = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const currentUserId = req.user?.id;
    const roomId = req.params.roomId || req.body.roomId;

    if (!currentUserId) {
      return next(new AppError("Login to access this route!", 401));
    }

    if (!roomId) {
      return res
        .status(400)
        .json({
          error: "Missing required roomId context identifier parameter.",
        });
    }

    // Run lookup query across your join table mapping
    const membershipRecord = await prisma.chatParticipant.findUnique({
      where: {
        roomId_userId: {
          roomId: roomId,
          userId: currentUserId,
        },
      },
    });

    if (!membershipRecord) {
      console.warn(
        `🚨 [Security Intrusion Alert] User ${currentUserId} attempted to access unauthorized Room: ${roomId}`,
      );
      return res
        .status(403)
        .json({
          error:
            "Access Denied. You are not a registered participant of this channel.",
        });
    }

    // Attach membership properties to request memory space for downstream pipeline visibility
    req.chatMembership = membershipRecord;

    return next(); // Pass validation cleanly down to your route processors
  } catch (error) {
    console.error("❌ [Chat Guard Error] Access evaluation faulted:", error);
    return res.status(500).json({ error: "Internal access evaluation error." });
  }
};
