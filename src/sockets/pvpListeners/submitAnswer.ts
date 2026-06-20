import { Server, Socket } from "socket.io";
import type { SubmitAnswerPayload } from "../types.js";
import type { ActiveMatchState } from "./battleModeStrategies.js"; // Assuming ActiveMatchState is exported

export default (
  io: Server,
  socket: Socket,
  activeMatches: Map<string, ActiveMatchState>,
) => {
  return (payload: SubmitAnswerPayload) => {
    const { roomId } = payload;
    const game = activeMatches.get(roomId);

    if (!game) {
      return socket.emit("pvp:error", { message: "Match not found." });
    }

    if (game.status !== "ACTIVE") {
      return socket.emit("pvp:error", { message: "Match is not active." });
    }

    // Roster Identification Guard
    const playerState = game.players[socket.id];
    if (!playerState) {
      return socket.emit("pvp:error", {
        message: "You are not registered in this match.",
      });
    }

    // Status Guard: Block multi-click exploits $ active lockout constraints
    if (
      playerState.hasAnsweredCurrent &&
      game.mode !== "SPRINT_1v1" &&
      game.mode !== "SPRINT_GRAND_PRIX"
    ) {
      return socket.emit("pvp:error", {
        message: "You have already answered this question.",
      });
    }

    if (playerState.lockoutStatus) {
      return socket.emit("pvp:error", {
        message: "Action denied. You are currently locked out.",
      });
    }

    // Delegate to the mode-specific strategy
    game.strategy.handleSubmitAnswer(io, socket, game, payload);
  };
};
