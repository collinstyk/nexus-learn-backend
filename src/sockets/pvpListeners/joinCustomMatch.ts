import { Server, Socket } from "socket.io";
import crypto from "node:crypto";
import type { PlayerProfile, CustomLobbyState } from "../types.js";
import { customLobbies } from "../index.js";
import matchReady from "../pvpListeners/matchReady.js";

export default (io: Server, socket: Socket, activeMatches: Map<string, any>) => {
  /**
   * EVENT: pvp:createCustom
   * Generates room and initializes slot structure based on mode.
   */
  socket.on("pvp:createCustom", (payload: { mode: any; subject: string }) => {
    try {
      const { mode, subject } = payload;
      if (!socket.userId) return;

      const roomCode = crypto.randomBytes(3).toString("hex").toUpperCase();
      const host: PlayerProfile = {
        socketId: socket.id,
        userId: socket.userId,
        name: socket.name,
        mode,
        subject
      };

      const lobby: CustomLobbyState = {
        roomCode,
        hostId: socket.userId,
        mode,
        subject,
        players: mode !== "COOP" ? [host] : [],
        teams: mode === "COOP" ? {
          teamA: { players: [host] },
          teamB: { players: [] }
        } : {
          teamA: { players: [] },
          teamB: { players: [] }
        }
      };

      customLobbies.set(roomCode, lobby);
      socket.join(roomCode);

      console.log(`🏠 [Custom Lobby] ${roomCode} created by ${socket.userId}`);
      socket.emit("pvp:customLobbyCreated", { roomCode, lobby });
    } catch (error) {
      console.error(`❌ [Create Custom Error]:`, error);
    }
  });

  /**
   * EVENT: pvp:joinCustom
   * Handles code validation and capacity constraints for teams/1v1.
   */
  socket.on("pvp:joinCustom", (payload: { roomCode: string }) => {
    try {
      const { roomCode } = payload;
      const lobby = customLobbies.get(roomCode);

      if (!lobby || !socket.userId) {
        return socket.emit("pvp:error", { message: "Invalid room code." });
      }

      const guest: PlayerProfile = {
        socketId: socket.id,
        userId: socket.userId,
        name: socket.name,
        mode: lobby.mode,
        subject: lobby.subject
      };

      if (lobby.mode === "COOP" && lobby.teams) {
        if (lobby.teams.teamA.players.length < 2) {
          guest.teamId = "TEAM_A";
          lobby.teams.teamA.players.push(guest);
        } else if (lobby.teams.teamB.players.length < 2) {
          guest.teamId = "TEAM_B";
          lobby.teams.teamB.players.push(guest);
        } else {
          return socket.emit("pvp:error", { message: "Lobby is at maximum capacity." });
        }
      } else if (lobby.players) {
        if (lobby.players.length >= 2) {
          return socket.emit("pvp:error", { message: "Lobby is full." });
        }
        lobby.players.push(guest);
      }

      socket.join(roomCode);
      io.to(roomCode).emit("pvp:lobbyUpdate", { lobby });
      console.log(`👤 [Custom Join] ${socket.userId} entered ${roomCode}`);
    } catch (error) {
      console.error(`❌ [Join Custom Error]:`, error);
    }
  });

  /**
   * EVENT: pvp:startCustom
   * Authoritative start by host. Flattens teams if necessary.
   */
  socket.on("pvp:startCustom", async (payload: { roomCode: string }) => {
    try {
      const { roomCode } = payload;
      const lobby = customLobbies.get(roomCode);

      if (!lobby || socket.userId !== lobby.hostId) {
        return socket.emit("pvp:error", { message: "Unauthorized." });
      }

      let participants: PlayerProfile[] = [];
      if (lobby.mode === "COOP" && lobby.teams) {
        if (lobby.teams.teamA.players.length + lobby.teams.teamB.players.length < 4) {
          return socket.emit("pvp:error", { message: "Insufficient players to start COOP." });
        }
        participants = [...lobby.teams.teamA.players, ...lobby.teams.teamB.players];
      } else {
        if ((lobby.players?.length || 0) < 2) {
          return socket.emit("pvp:error", { message: "Need at least 2 players." });
        }
        participants = lobby.players || [];
      }

      customLobbies.delete(roomCode);
      console.log(`🚀 [Custom Start] Launching ${roomCode}`);

      await matchReady(
        io, 
        socket, 
        activeMatches, 
        roomCode, 
        participants, 
        lobby.subject, 
        lobby.mode,
        {
          totalQuestions: 0
        } // Ticking Bomb
      );
    } catch (error) {
      console.error(`❌ [Start Custom Error]:`, error);
    }
  });
};