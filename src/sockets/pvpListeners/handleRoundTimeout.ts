import { Server } from "socket.io";
import type { ActiveMatchState } from "./battleModeStrategies.js"; // Assuming ActiveMatchState is exported

export default (io: Server, activeMatches: Map<string, ActiveMatchState>) => {
  return (roomId: string) => {
    const game = activeMatches.get(roomId);

    if (!game) {
      console.warn(`[HandleRoundTimeout] Match ${roomId} not found for timeout.`);
      return;
    }

    if (game.status !== "ACTIVE") {
      console.warn(`[HandleRoundTimeout] Match ${roomId} is not active, skipping timeout handling.`);
      return;
    }

    // Delegate to the mode-specific strategy
    game.strategy.handleRoundTimeout(io, game);
  };
};