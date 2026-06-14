import { Server, Socket } from "socket.io";
import { saveMatchResults } from "../services/matchService.js";

export default (io: Server, socket: Socket, activeMatches: Map<any, any>) => {
  return async (payload: any) => {
    try {
      // --- 1. RECEIVE & VALIDATE PAYLOAD ---
      const roomId = payload?.roomId;

      if (!roomId) {
        console.warn(
          `⚠️ [PvP Leave] Socket ${socket.id} sent a leave event without a roomId.`,
        );
        return socket.emit("pvp:error", {
          message: "Invalid room identifier provided.",
        });
      }

      console.log(
        `🏃‍♂️ [PvP Leave] Player ${socket.id} is leaving room: ${roomId}`,
      );

      // --- 2. FETCH CURRENT STATE ---
      const game = activeMatches.get(roomId);
      if (!game) return; // Exit early if room is already cleared

      // --- 3. ACTIVE MATCH FORFEIT CHECK (Multi-Player & Team Aware) ---
      if (game.status === "ACTIVE") {
        console.log(
          `🚨 [Forfeit] Match ${roomId} interrupted. Player ${socket.id} left early.`,
        );

        const remainingSocketIds = Object.keys(game.players).filter(
          (id) => id !== socket.id,
        );
        const leaver = game.players[socket.id];
        let shouldEndMatch = false;

        if (game.mode === "COOP") {
          const teammatesLeft = remainingSocketIds.some(
            (id) => game.players[id].teamId === leaver?.teamId,
          );

          if (!teammatesLeft) {
            console.log(
              `🤝 [Team Abandonment] Team ${leaver?.teamId} has no players left in room ${roomId}.`,
            );
            shouldEndMatch = true;
          }
        } else if (remainingSocketIds.length === 1) {
          // Standard 1v1 logic
          delete game.players[socket.id];
          shouldEndMatch = true;
        }

        if (shouldEndMatch) {
          // Kill background timers
          if (game.questionTimeout) clearTimeout(game.questionTimeout);
          if (game.quizTimeout) clearTimeout(game.quizTimeout);

          // Broadcast to everyone else (the winners)
          socket.to(roomId).emit("pvp:matchOver", {
            message: `Match ended: Opponent ${leaver?.name || "Player"} or their team left the match.`,
            finalScores: game.players,
            forfeitWin: true,
          });

          game.status = "COMPLETED";
          await saveMatchResults(io, roomId, game, activeMatches);
          // 2. Clear from activeMatches
          activeMatches.delete(roomId);
          console.log(
            `[MatchService] BattleSession ${game.battleSessionId} results saved and match ${roomId} cleared from memory.`,
          );
          console.log(
            `🏁 [Forfeit Handled] Room ${roomId} transitioned to COMPLETED.`,
          );
        } else {
          // Match continues (e.g., in a 2v2 if 1 person leaves, or in a large Battle Royale)
          if (game.players[socket.id]) {
            delete game.players[socket.id];
          }
        }
      } else {
        // --- 4. NON-ACTIVE CLEANUP (Pre-game or Post-game) ---
        // Strip out the leaving player safely
        if (game.players && game.players[socket.id]) {
          delete game.players[socket.id];
        }

        // Clean up the room tracking state if it is now entirely hollow
        if (
          Object.keys(game.players).length === 0 ||
          game.status === "COMPLETED"
        ) {
          if (game.questionTimeout) clearTimeout(game.questionTimeout);
          if (game.quizTimeout) clearTimeout(game.quizTimeout);
          activeMatches.delete(roomId);
          console.log(
            `🧹 [Garbage Collection] Room ${roomId} has been completely cleared.`,
          );
        }
      }

      // --- 5. NETWORK ISOLATION ---
      socket.leave(roomId);
      socket.emit("pvp:leftRoomSuccess", {
        message: "Successfully left the match session.",
        roomId,
      });
    } catch (error) {
      console.error(
        `❌ [PvP Leave Error] Failed to process leaveRoom for socket ${socket.id}:`,
        error,
      );
      socket.emit("pvp:error", {
        message: "An internal server error occurred while leaving the room.",
      });
    }
  };
};
