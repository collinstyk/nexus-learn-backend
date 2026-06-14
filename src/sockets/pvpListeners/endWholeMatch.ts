import { Server } from "socket.io";
import { saveMatchResults } from "../services/matchService.js";

/**
 * Natural Conclusion Track
 * Handles graceful termination when questions run out or the master clock expires.
 */
export default async (io: Server, activeMatches: Map<any, any>, roomId: string) => {
  try {
    const game = activeMatches.get(roomId);

    // 1. Atomic Race-Condition Gate
    if (!game || game.status === "COMPLETED") {
      return;
    }

    console.log(`🏁 [Natural Conclusion] Match ${roomId} has reached its end state.`);
    game.status = "COMPLETED";

    // 2. Engine Cleanup: Kill all active RAM tickers to prevent leaks
    if (game.questionTimeout) {
      clearTimeout(game.questionTimeout);
      game.questionTimeout = null;
    }
    if (game.quizTimeout) {
      clearTimeout(game.quizTimeout);
      game.quizTimeout = null;
    }

    // 3. Leaderboard Compilation
    const standings = Object.values(game.players)
      .map((p: any) => ({
        userId: p.userId,
        name: p.name,
        score: p.score,
        teamId: p.teamId,
        progress: p.playerQuestionIndex || game.currentQuestionIndex
      }))
      .sort((a, b) => b.score - a.score);

    // 4. Final Broadcast
    io.to(roomId).emit("pvp:matchOver", {
      message: "The match has concluded! Check the final standings.",
      leaderboard: standings
    });

    // 5. Database Persistence & RAM Evacuation
    await saveMatchResults(io, roomId, game, activeMatches);

    // 6. Channel Dissolution
    io.in(roomId).socketsLeave(roomId);
    activeMatches.delete(roomId);

  } catch (error) {
    console.error(`❌ [Match Conclusion Error] Failed to end match ${roomId} gracefully:`, error);
  }
};
