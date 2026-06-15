import type { NextFunction, Request, Response } from "express";
import prisma from "../prisma.js";
import { ChatRole } from "@prisma/client";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";

/**
 * Direct Message (1-on-1) Provisioning Engine
 */
export const createDirectMessageRoom = catchAsync(
  async (req: Request, res: Response) => {
    try {
      const currentUserId = req.user?.id; // Sourced from your incoming auth token
      const { recipientId } = req.body;

      if (!recipientId) {
        return res
          .status(400)
          .json({ error: "Recipient ID identifier is required." });
      }

      if (currentUserId === recipientId) {
        return res
          .status(400)
          .json({
            error: "You cannot initiate a private DM channel with yourself.",
          });
      }

      // SECURITY / EXTRACTION PRE-FLIGHT GUARD:
      // Check if a direct message room already exists between these two users
      const existingRoom = await prisma.chatRoom.findFirst({
        where: {
          isGroup: false,
          AND: [
            { chatParticipants: { some: { userId: currentUserId } } },
            { chatParticipants: { some: { userId: recipientId } } },
          ],
        },
        include: {
          chatParticipants: true,
        },
      });

      if (existingRoom) {
        console.log(
          `ℹ️ [Chat DM Info] Reusing existing DM channel ${existingRoom.id}`,
        );
        return res.status(200).json(existingRoom);
      }

      // ATOMIC TRANSACTION: Create room and bind both participants simultaneously
      const newRoom = await prisma.$transaction(async (tx: any) => {
        const room = await tx.chatRoom.create({
          data: {
            isGroup: false,
            name: null, // DMs carry no explicit title
          },
        });

        await tx.chatParticipant.createMany({
          data: [
            { roomId: room.id, userId: currentUserId, role: ChatRole.MEMBER },
            { roomId: room.id, userId: recipientId, role: ChatRole.MEMBER },
          ],
        });

        return room;
      });

      console.log(
        `🆕 [Chat DM Created] Room ID: ${newRoom.id} spawned successfully.`,
      );
      return res.status(211).json(newRoom);
    } catch (error) {
      console.error(
        "❌ [DM Controller Error] Room provisioning failed:",
        error,
      );
      return res
        .status(500)
        .json({ error: "An internal database error occurred." });
    }
  },
);

/**
 * Group Study Space / Collaboration Pod Provisioning Engine
 */
export const createGroupRoom = catchAsync(
  async (req: Request, res: Response) => {
    try {
      const currentUserId = req.user?.id;
      const { groupName, invitedUserIds } = req.body; // invitedUserIds expected as an array of strings

      if (!groupName || groupName.trim() === "") {
        return res
          .status(400)
          .json({ error: "A valid group name is required." });
      }

      // Process group provisioning atomicity block
      const newGroupRoom = await prisma.$transaction(async (tx: any) => {
        const room = await tx.chatRoom.create({
          data: {
            isGroup: true,
            name: groupName.trim(),
          },
        });

        // Prepare multi-row insert collection
        const participantsData: {
          roomId: string;
          userId: any;
          role: ChatRole;
        }[] = [
          { roomId: room.id, userId: currentUserId, role: ChatRole.ADMIN }, // Creator gets elevation rights
        ];

        // Add structural loops for initial batch of invited peers
        if (Array.isArray(invitedUserIds) && invitedUserIds.length > 0) {
          invitedUserIds.forEach((userId: string) => {
            if (userId !== currentUserId) {
              participantsData.push({
                roomId: room.id,
                userId: userId,
                role: ChatRole.MEMBER,
              });
            }
          });
        }

        await tx.chatParticipant.createMany({
          data: participantsData,
        });

        return room;
      });

      console.log(
        `👥 [Chat Group Created] ${newGroupRoom.name} initialized with ${invitedUserIds?.length + 1} users.`,
      );
      return res.status(201).json(newGroupRoom);
    } catch (error) {
      console.error(
        "❌ [Group Controller Error] Failed to spin up group room:",
        error,
      );
      return res
        .status(500)
        .json({ error: "An internal database error occurred." });
    }
  },
);

/**
 * Retrieve user's chatRoom message history
 */
export const getChatHistory = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { roomId } = req.params as { roomId: string };
    const limit = parseInt(req.query.limit as string) || 20;
    const cursor = req.query.cursor as string; // last message ID pointer

    if (!roomId) return next(new AppError('Chat room ID not provided', 400));

    const messages = await prisma.message.findMany({
      where: { roomId },
      take: limit,
      ...(cursor && 
        {
          skip: 1,
          cursor: {id: cursor},
        }
      ),
      orderBy: {
        createdAt: "desc"
      }
    }) as {
    id: string;
    roomId: string;
    senderId: string;
    content: string;
    isRead: boolean;
    createdAt: Date;
}[];

    // Next cursor for the client's next chat history request
    const nextCursor =
      messages.length === limit  && messages.length > 0 ? messages.at(-1)?.id : null;

    res.status(200).json({
      status: "success",
      results: messages.length,
      data: {
        messages: messages.reverse(), // reverse so the last message can be rendered at the bottom in the ui, and then scrolled to automatically
        nextCursor
      }
    })
  },
);

/**
 * Unread message tracking function
 */
export const markRoomAsRead = catchAsync(async (req: Request, res: Response) => {
  const { roomId } = req.params as {roomId: string};
  const currentUserId = req.user?.id as string;

  await prisma.message.updateMany({
    where: {
      roomId: roomId,
      senderId: { not: currentUserId },
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });

  res.status(200).json({
    status: "success",
    message: "All incoming messages marked as read.",
  });
});

/**
 * Remove a user from a chat group
 */
export const kickRoomMember = catchAsync(async (req: Request, res: Response) => {
  const { roomId } = req.params as {roomId: string};
  const { userIdToKick } = req.body; // The ID of the student being removed

  // Verify the requester is an ADMIN
  if (req.chatMembership?.role !== "ADMIN") {
    return res.status(403).json({ status: "fail", message: "Forbidden. Admin clearance required." });
  }

  // Remove the target user from the room membership pool
  await prisma.chatParticipant.deleteMany({
    where: {
      roomId: roomId,
      userId: userIdToKick,
    },
  });

  res.status(200).json({
    status: "success",
    message: "Member successfully expelled from the study group.",
  });
});

/**
 * Delete a Message
 */  
export const deleteRoomMessage = catchAsync(async (req: Request, res: Response) => {
  const { roomId, messageId } = req.params as {roomId: string, messageId: string};

  // Verify the requester is an ADMIN
  if (req.chatMembership?.role !== "ADMIN") {
    return res.status(403).json({ status: "fail", message: "Forbidden. Admin clearance required." });
  }

  // Permanently purge the specific message record
  await prisma.message.delete({
    where: {
      id: messageId,
      roomId: roomId, // Ensures the message belongs to this room context
    },
  });

  res.status(200).json({
    status: "success",
    message: "Message successfully purged by administrator.",
  });
});
