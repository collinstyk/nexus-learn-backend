import { Server } from "socket.io";
import prisma from "../../prisma.js";
import type { ActiveMatchState } from "../pvpListeners/battleModeStrategies.js";
import { MatchStatus } from "../../generated/prisma/enums.js"; // Assuming MatchStatus enum is generated

/**
 * Saves the final state of a match to the database and cleans up the in-memory active match.
 * This function should be called when a match officially ends (completion or forfeit).
 * @param roomId The ID of the room/match.
 * @param game The in-memory game state.
 * @param activeMatches The Map holding all active matches.
 */
export const saveMatchResults = async (
  io: Server, // Pass io to potentially emit final results
  roomId: string,
  game: ActiveMatchState,
  activeMatches: Map<string, ActiveMatchState>
) => {
  try {
    console.log(`[MatchService] Saving results for BattleSession: ${game.battleSessionId}`);

    // Determine winner (simplified for now, actual logic will be mode-specific)
    let winnerId: string | null = null;
    const playerScores = Object.values(game.players).map(p => ({ userId: p.userId, score: p.score }));
    if (playerScores.length > 0) {
      const maxScore = Math.max(...playerScores.map(p => p.score));
      const topScorers = playerScores.filter(p => p.score === maxScore) as { userId: string; score: number; }[];
      if (topScorers.length === 1) {
        winnerId = topScorers[0]?.userId as string;
      }
      // For ties, winnerId remains null or can be set to a specific "tie" indicator
    }

    // 1. Update BattleSession status and winner
    await prisma.battleSession.update({
      where: { id: game.battleSessionId },
      data: {
        status: game.status as MatchStatus, // Ensure status is a valid MatchStatus enum
        winnerId: winnerId,
      },
    });

  } catch (error) {
    console.error(`❌ [MatchService Error] Failed to save match results for room ${roomId}:`, error);
  }
};