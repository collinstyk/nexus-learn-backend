import { Server, Socket } from "socket.io";
import crypto from "node:crypto";
import type { BattleMode, CustomLobbyState, PlayerProfile, PresetConfig } from "../types.js";
import matchReady from "../pvpListeners/matchReady.js";

// In-memory registry for private lobbies (Server-side RAM storage)
export const customLobbies = new Map<string, CustomLobbyState>();

/**
 * Generator for a unique 6-character alphanumeric room code
 */
const generateRoomCode = (): string => {
  return crypto.randomBytes(3).toString("hex").toUpperCase();
};

export default (io: Server, socket: Socket, activeMatches: Map<any, any>) => {
  /**
   * EVENT: pvp:createCustom
   * Allows a user to host a private lobby for others to join via code.
   */
  socket.on("pvp:createCustom", (payload: { mode: BattleMode; subject: string, }) => {
    try {
      const { mode, subject } = payload;
      if (!socket.userId) {
        return socket.emit("pvp:error", { message: "Authentication failed. Access denied." });
      }

      const roomCode = generateRoomCode();
      const hostProfile: PlayerProfile = {
        socketId: socket.id,
        userId: socket.userId,
        name: socket.name || "Anonymous Host",
        mode,
        subject
      };

      const lobbyState: CustomLobbyState = {
        roomCode,
        hostId: socket.userId,
        subject,
        mode,
        players: [hostProfile]
      };

      customLobbies.set(roomCode, lobbyState);
      socket.join(roomCode);

      console.log(`🏠 [Custom Lobby] Room ${roomCode} created by Host: ${socket.userId}`);
      
      socket.emit("pvp:customLobbyCreated", { roomCode, lobby: lobbyState });
    } catch (error) {
      console.error(`❌ [Create Custom Error]:`, error);
      socket.emit("pvp:error", { message: "Failed to create private lobby instance." });
    }
  });

  /**
   * EVENT: pvp:startCustom
   * Triggered by the host to move all gathered players into the authoritative match engine.
   */
  socket.on("pvp:startCustom", async (payload: { roomCode: string, presetConfig: PresetConfig }) => {
    try {
      const { roomCode, presetConfig } = payload;
      const lobby = customLobbies.get(roomCode);

      if (!lobby || socket.userId !== lobby.hostId) {
        return socket.emit("pvp:error", { message: "Unauthorized or lobby does not exist." });
      }

      // Flush lobby from staging and hand off to the engine
      customLobbies.delete(roomCode);
      console.log(`🚀 [Custom Start] Transitioning lobby ${roomCode} to Active Engine.`);
      
      await matchReady(io, socket, activeMatches, roomCode, lobby.players, lobby.subject, lobby.mode, presetConfig);
    } catch (error) {
      console.error(`❌ [Start Custom Error]:`, error);
      socket.emit("pvp:error", { message: "Failed to launch custom match engine." });
    }
  });
};