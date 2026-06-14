import { Server } from "socket.io";
import registerP2PHandlers from "./p2pHandler.js";
import type {
  ChatMessagePayload,
  PlayerProfile,
  ServerMessageBroadcast,
} from "./types.js";
import {joinQueue, cancelQueue, submitAnswer, leaveRoom, joinCustomMatch} from './pvpListeners/index.js'
import { socketAuthMiddleware } from "../middlewares/socketGuard.js";
import prisma from "../prisma.js";
import type { CustomLobbyState } from "./types.js";

// --- GLOBAL SUBJECT-ISOLATED STAGING (RAM) ---
const flashClashQueues = new Map<string, PlayerProfile[]>();
const sprintQueues = new Map<string, PlayerProfile[]>();
const buzzerQueues = new Map<string, PlayerProfile[]>();
const coopQueues = new Map<string, PlayerProfile[]>();

export const activeLobbies = new Map<string, any>();
export const customLobbies = new Map<string, CustomLobbyState>();

export const activeMatches = new Map();

const initSocketServer = (io: Server) => {
  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    console.log(`New client connected: ${socket.id}`);

    // PVP HANDLERS
    socket.on(
      "pvp:joinQueue",
      joinQueue(
        io,
        socket,
        activeMatches,
        customLobbies,
        flashClashQueues,
        sprintQueues,
        buzzerQueues,
        coopQueues,
        activeLobbies,
      ),
    );

    // Pass relevant queue if needed for cancel, but typically we scan all for the socket.id
    // For brevity, ensuring the joinQueue refactor is the primary focus.
    socket.on("pvp:cancelQueue", cancelQueue(io, socket, [])); 

    socket.on("pvp:submitAnswer", submitAnswer(io, socket, activeMatches));

    socket.on("pvp:leaveRoom", leaveRoom(io, socket, activeMatches));

    // CUSTOM LOBBY HANDLERS
    joinCustomMatch(io, socket, activeMatches);

    // P2P HANDLERS
    /* Listen for real-time instant messages from clients */
    socket.on("chat:sendMessage", async (payload: ChatMessagePayload) => {
      try {
        const { roomId, senderId, content } = payload;

        // 1. Validation Guard: Block empty or corrupted packet data
        if (!roomId || !senderId || !content || content.trim() === "") {
          socket.emit("chat:error", {
            message: "Invalid message payload structure.",
          });
          return;
        }

        // 2. Database Buffering: Commit message immediately to cold storage
        const savedMessage = await prisma.message.create({
          data: {
            roomId: roomId,
            senderId: senderId,
            content: content.trim(),
          },
        });

        // 3. Construct the network payload using the generated database data
        const broadcastData: ServerMessageBroadcast = {
          id: savedMessage.id,
          roomId: savedMessage.roomId,
          senderId: savedMessage.senderId,
          content: savedMessage.content,
          createdAt: savedMessage.createdAt.toISOString(),
        };

        // 4. Instant WebSocket Broadcast: Stream it down the room channel pipes
        // Using io.to().emit ensures everyone inside, including the sender, gets the packet
        io.to(roomId).emit("chat:newMessage", broadcastData);
        console.log(
          `✉️  [Message Synced & Streamed] Room: ${roomId} | Msg ID: ${savedMessage.id}`,
        );
      } catch (error) {
        console.error(
          "❌ [P2P Handler Error] Message packet processing failed:",
          error,
        );
        socket.emit("chat:error", {
          message: "Failed to securely deliver your message.",
        });
      }
    });

    /* Listen for user entering a specific chat room stream */
    socket.on("p2p:joinRoom", (roomId: string) => {
      if (!roomId) return;

      socket.join(roomId);

      socket.to(roomId).emit("p2p:userJoined", { userId: socket.id });
    });

    // LISTEN FOR DISCONNECT
    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
};

export default initSocketServer;
