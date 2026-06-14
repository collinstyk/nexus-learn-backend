import { Server, Socket } from "socket.io";
import type { PlayerProfile, CustomLobbyState } from "../types.js";
import crypto from "node:crypto";
import matchReady from "./matchReady.js";

interface LiveLobby {
  lobbyId: string;
  mode: string;
  subject: string;
  configKey: string;
  players: PlayerProfile[];
  timerRef: NodeJS.Timeout | null;
}

const generateQueueKey = (subject: string, mode: string, config: any): string => {
  if (mode === "SPRINT" || mode === "VELOCITY_ROYALE") {
    const duration = config?.durationPerQuiz || 120; // Macro quiz countdown timer (seconds)
    const questions = config?.totalQuestions || 20;
    return `${subject}:${mode}-${duration}s-${questions}q`; // eg: MATHEMATICS:SPRINT-120s-20q
  } else {
    const seconds = config?.secondsPerQuestion || 15; // Micro per-question ticker
    const questions = config?.totalQuestions || 10;
    return `${subject}:${mode}-${seconds}s-${questions}q`;// eg: MATHEMATICS:FLASH_CLASH-15s-10q
  }
};

/**
 * Security check to prevent multi-track registration
 */
const isUserEngaged = (
  userId: string,
  customLobbies: Map<string, CustomLobbyState>,
  flashClashQueues: Map<string, PlayerProfile[]>,
  sprintQueues: Map<string, PlayerProfile[]>,
  buzzerQueues: Map<string, PlayerProfile[]>,
  coopQueues: Map<string, PlayerProfile[]>,
  activeLobbies: Map<string, LiveLobby>,
): boolean => {
  const allQueues = [flashClashQueues, sprintQueues, buzzerQueues, coopQueues];
  for (const map of allQueues) {
    for (const queue of map.values()) {
      if (queue.some((p) => p.userId === userId)) return true;
    }
  }
  const inActiveLobby = Array.from(activeLobbies.values()).some((l) =>
    l.players.some((p) => p.userId === userId),
  );
  const inCustomLobby = Array.from(customLobbies.values()).some(
    (l) =>
      l.players.some((p) => p.userId === userId) ||
      (l.teams &&
        (l.teams.teamA.players.some((p) => p.userId === userId) ||
          l.teams.teamB.players.some((p) => p.userId === userId))),
  );
  return inActiveLobby || inCustomLobby;
};

export default (
    io: Server,
    socket: Socket,
    activeMatches: Map<any, any>,
    customLobbies: Map<string, CustomLobbyState>,
    flashClashQueues: Map<string, PlayerProfile[]>,
    sprintQueues: Map<string, PlayerProfile[]>,
    buzzerQueues: Map<string, PlayerProfile[]>,
    coopQueues: Map<string, PlayerProfile[]>,
    activeLobbies: Map<string, LiveLobby>,
  ) =>
  (payload: any) => {
    try {
      const mode = payload?.mode || "FLASH_CLASH";
      const subject = payload?.subject || "GENERAL";
      const config = payload?.presetConfig || {};
      const queueKey = generateQueueKey(subject, mode, config);

      if (!socket.userId) return;

      // Check if user is already in a queue or lobby
      if (
        isUserEngaged(
          socket.userId,
          customLobbies,
          flashClashQueues,
          sprintQueues,
          buzzerQueues,
          coopQueues,
          activeLobbies,
        )
      ) {
        return socket.emit("pvp:queueJoinedSuccess", {
          message: "You are already securely placed in a waiting track.",
          mode,
          subject,
        });
      }

      const newPlayer: PlayerProfile = {
        socketId: socket.id,
        userId: socket.userId,
        name: socket.name || "Anonymous Student",
        subject,
        mode,
      };

      // --- ROUTE PATH A: INSTANT FIFO (Subject Isolated) ---
      if (mode === "FLASH_CLASH" || mode === "SPRINT" || mode === "BUZZER") {
        const modeMap =
          mode === "FLASH_CLASH"
            ? flashClashQueues
            : mode === "SPRINT"
              ? sprintQueues
              : buzzerQueues;

        if (!modeMap.has(queueKey)) modeMap.set(queueKey, []);
        const queue = modeMap.get(queueKey)!;
        queue.push(newPlayer);
        console.log(modeMap);
        

        if (queue.length === 2) {
          const participants = queue.splice(0, 2);
          const roomId = crypto.randomUUID();
          participants.forEach((p) =>
            io.sockets.sockets.get(p.socketId)?.join(roomId),
          );
          console.log(
            `⚡ [FIFO Match] Subject: ${subject} | Mode: ${mode} | Room: ${roomId}`,
          );
          return matchReady(
            io,
            socket,
            activeMatches,
            roomId,
            participants,
            subject,
            mode,
           config,
          );
        }

        return socket.emit("pvp:queueJoinedSuccess", {
          message: "Searching for an opponent...",
          mode,
          subject,
        });
      }

      // --- ROUTE PATH B: AUTOMATED COOP (2v2) ---
      if (mode === "COOP") {
        if (!coopQueues.has(queueKey)) coopQueues.set(queueKey, []);
        const queue = coopQueues.get(queueKey)!;
        queue.push(newPlayer);

        if (queue.length === 4) {
          const participants = queue.splice(0, 4);
          const roomId = crypto.randomUUID();

          participants.forEach((p, idx) => {
            p.teamId = idx < 2 ? "TEAM_A" : "TEAM_B";
            io.sockets.sockets.get(p.socketId)?.join(roomId);
          });

          console.log(`🤝 [COOP Match] Subject: ${subject} | Room: ${roomId}`);
          return matchReady(
            io,
            socket,
            activeMatches,
            roomId,
            participants,
            subject,
            mode,
            config
          );
        }
        return socket.emit("pvp:queueJoinedSuccess", {
          message: "Waiting for teammates...",
          mode,
          subject,
        });
      }

      // --- ROUTE PATH C: TIMER LOBBIES ---
      if (mode === "BATTLE_ROYALE" || mode === "PASS_THE_QUESTION" || mode === "VELOCITY_ROYALE") {
        let lobby = Array.from(activeLobbies.values()).find(
          (l) => l.configKey === queueKey,
        );

        if (!lobby) {
          const lobbyId = crypto.randomUUID();
          let lobbyTimeout = 60000;
          if (mode === "BATTLE_ROYALE") lobbyTimeout = 30000/*540000;*/
          if (mode === "VELOCITY_ROYALE") lobbyTimeout = 30000/*540000;*/
          if (mode === "PASS_THE_QUESTION") lobbyTimeout = 30000/*180000;*/

          const duration = (config?.durationPerQuiz || 120) * 1000;

          const timerRef = setTimeout(() => {
            const finalLobbyState = activeLobbies.get(lobbyId);
            if (!finalLobbyState) return;

            activeLobbies.delete(lobbyId);

            if (
              (finalLobbyState.mode === "PASS_THE_QUESTION" || finalLobbyState.mode === "VELOCITY_ROYALE") &&
              finalLobbyState.players.length < 2
            ) {
              finalLobbyState.players.forEach((p) => {
                io.to(p.socketId).emit("pvp:error", {
                  message: "Lobby dissolved: Insufficient players.",
                });
              });
              return;
            }

            matchReady(
              io,
              socket,
              activeMatches,
              lobbyId,
              finalLobbyState.players,
              subject,
              mode,
              config
            );
          }, lobbyTimeout);

          lobby = { lobbyId, mode, subject, configKey: queueKey, players: [], timerRef };
          activeLobbies.set(lobbyId, lobby);          
        }

        socket.join(lobby.lobbyId);
        lobby.players.push(newPlayer);

        // PASS_THE_QUESTION early trigger
        if (mode === "PASS_THE_QUESTION" && lobby.players.length === 4) {
          if (lobby.timerRef) clearTimeout(lobby.timerRef);
          activeLobbies.delete(lobby.lobbyId);
          return matchReady(
            io,
            socket,
            activeMatches,
            lobby.lobbyId,
            lobby.players,
            subject,
            mode,
            config
          );
        }

        io.to(lobby.lobbyId).emit("pvp:lobbyUpdate", {
          playerCount: lobby.players.length,
          mode,
        });
        return socket.emit("pvp:queueJoinedSuccess", {
          message: "Lobby entered successfully.",
          mode,
          subject,
        });
      }
    } catch (error) {
      console.error(`❌ [Matchmaking Error]:`, error);
      return socket.emit("pvp:error", {
        message: "An internal game server error disrupted matchmaking.",
      });
    }
  };
