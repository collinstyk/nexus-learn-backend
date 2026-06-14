import { Server, Socket } from "socket.io";
import type { BattleMode } from "../types.js";
import sendNextQuestion from "./sendNextQuestion.js";
import { activeMatches } from "../index.js";

// Assuming ActiveMatchState is the type of object stored in activeMatches Map
export interface ActiveMatchState {
  roomId: string;
  battleSessionId: string; // Link to the Prisma BattleSession record
  status: "STARTING" | "ACTIVE" | "COMPLETED" | "FORFEITED";
  subjectName: string;
  mode: BattleMode;
  presetConfig?: any;
  currentQuestionIndex: number;
  questionStartTime: number | null;
  firstAnswerSocketId: string | null;
  questions: any[]; // Replace with actual Question type
  players: Record<
    string,
    {
      userId: string;
      name: string;
      score: number;
      status: "ELIMINATED" | "ALIVE";
      teamId?: string;
      lockoutStatus: boolean;
      hasAcknowledged: boolean;
      hasAnsweredCurrent: boolean;
      playerQuestionIndex: number;
      currentRoundChoice: any; // Player's chosen option
      currentRoundPoints: number;
    }
  >;
  questionTimeout: NodeJS.Timeout | null;
  quizTimeout?: NodeJS.Timeout | null;
  strategy: BattleModeStrategy; // Self-reference for type safety
  // Add other common match state properties here
}

interface SubmitAnswerPayload {
  roomId: string;
  questionId: string;
  answer: string; // Or index of answer
  responseTime: number; // Time taken to answer in ms
}

export interface BattleModeStrategy {
  // Handles logic when a player submits an answer
  handleSubmitAnswer(
    io: Server,
    socket: Socket,
    game: ActiveMatchState,
    payload: SubmitAnswerPayload,
  ): void | boolean;

  // Handles logic when a question timer expires
  handleRoundTimeout(io: Server, game: ActiveMatchState): void;

  // Potentially other common match lifecycle methods
  // e.g., initializeRound, evaluateRound, endGame
}

// Concrete Strategy Implementations (Placeholders)
class FlashClashStrategy implements BattleModeStrategy {
  handleSubmitAnswer(
    io: Server,
    socket: Socket,
    game: ActiveMatchState,
    payload: SubmitAnswerPayload,
  ): void {
    const playerState = game.players[socket.id];
    console.log(
      `[FlashClashStrategy] Player ${playerState?.name} submitted answer for question ${payload.questionId}`,
    );
    // Implement scoring, velocity rewards, check for end of round, etc.
    // Example:
    if (playerState && !playerState.hasAnsweredCurrent) {
      playerState.hasAnsweredCurrent = true;
      // Placeholder for actual scoring logic
      const isCorrect = Math.random() > 0.5; // Simulate correctness
      const points = isCorrect ? 100 : 0;
      const velocityBonus = isCorrect && payload.responseTime < 3000 ? 50 : 0;
      playerState.score += points + velocityBonus;
      playerState.currentRoundPoints = points + velocityBonus;
      playerState.currentRoundChoice = payload.answer;

      io.to(game.roomId).emit("pvp:playerAnswered", {
        userId: socket.userId,
        score: playerState.score,
        isCorrect,
        velocityBonus,
        // ... other relevant info for UI
      });

      // Check if all players have answered
      const allAnswered = Object.values(game.players).every(
        (p) => p.hasAnsweredCurrent,
      );
      if (allAnswered) {
        // Trigger round evaluation/next question
        console.log(
          `[FlashClashStrategy] All players answered. Evaluating round.`,
        );
        // This would typically call a central round evaluation function
        // For now, let's just reset for next round
        Object.values(game.players).forEach((p) => {
          p.hasAnsweredCurrent = false;
          p.currentRoundChoice = null;
          p.currentRoundPoints = 0;
        });

        if (game.questionTimeout) {
          clearTimeout(game.questionTimeout);
          game.questionTimeout = null;
        }

        game.currentQuestionIndex++;
        // Emit event to load next question or end game
        sendNextQuestion(io, activeMatches, game.roomId);
      }
    }
  }

  handleRoundTimeout(io: Server, game: ActiveMatchState): void {
    console.log(`[FlashClashStrategy] Round timeout for room ${game.roomId}`);
    // Award 0 points to players who haven't answered
    Object.values(game.players).forEach((playerState) => {
      if (!playerState.hasAnsweredCurrent) {
        playerState.currentRoundPoints = 0; // Explicitly 0 for no answer
        io.to(game.roomId).emit("pvp:playerNoAnswer", {
          userId: playerState.userId,
          score: playerState.score, // Score remains unchanged
        });
      }
      playerState.hasAnsweredCurrent = false;
      playerState.currentRoundChoice = null;
    });
    game.currentQuestionIndex++;
    // Emit event to load next question or end game
    sendNextQuestion(io, activeMatches, game.roomId);
  }
}

class BattleRoyaleStrategy implements BattleModeStrategy {
  handleSubmitAnswer(
    io: Server,
    socket: Socket,
    game: ActiveMatchState,
    payload: SubmitAnswerPayload,
  ): void {
    const playerState = game.players[socket.id];
    // Similar to FlashClash, but potentially different scoring for multiple players
    // and elimination logic.
    if (playerState && !playerState.hasAnsweredCurrent) {
      console.log(
        `[BattleRoyaleStrategy] Player ${playerState?.name} submitted answer for question ${payload.questionId}`,
      );
      playerState.hasAnsweredCurrent = true;
      const isCorrect = Math.random() > 0.5; // Simulate correctness
      const points = isCorrect ? 100 : 0;
      const velocityBonus = isCorrect && payload.responseTime < 3000 ? 50 : 0;
      playerState.score += points + velocityBonus;
      playerState.currentRoundPoints = points + velocityBonus;
      playerState.currentRoundChoice = payload.answer;

      io.to(game.roomId).emit("pvp:playerAnswered", {
        userId: playerState.userId,
        score: playerState.score,
        isCorrect,
        velocityBonus,
        // ... other relevant info for UI
      });

      // Check if all active players have answered or if enough time has passed
      const activePlayers = Object.values(game.players).filter(
        (p) => p.status !== "ELIMINATED",
      ); // Assuming a status
      const allActiveAnswered = activePlayers.every(
        (p) => p.hasAnsweredCurrent,
      );
      if (allActiveAnswered) {
        console.log(
          `[BattleRoyaleStrategy] All active players answered. Evaluating round.`,
        );
        // Implement elimination logic here
        // For now, just reset
        Object.values(game.players).forEach((p) => {
          p.hasAnsweredCurrent = false;
          p.currentRoundChoice = null;
          p.currentRoundPoints = 0;
        });

        if (game.questionTimeout) {
          clearTimeout(game.questionTimeout);
          game.questionTimeout = null;
        }

        game.currentQuestionIndex++;
        sendNextQuestion(io, activeMatches, game.roomId);
      }
    }
  }

  handleRoundTimeout(io: Server, game: ActiveMatchState): void {
    console.log(`[BattleRoyaleStrategy] Round timeout for room ${game.roomId}`);
    // Award 0 points to players who haven't answered, potentially eliminate lowest scorers
    Object.values(game.players).forEach((playerState) => {
      if (!playerState.hasAnsweredCurrent) {
        playerState.currentRoundPoints = 0;
        io.to(game.roomId).emit("pvp:playerNoAnswer", {
          userId: playerState.userId,
          score: playerState.score,
        });
      }
      playerState.hasAnsweredCurrent = false;
      playerState.currentRoundChoice = null;
    });
    // Implement elimination logic based on scores or no-answer
    game.currentQuestionIndex++;
    sendNextQuestion(io, activeMatches, game.roomId);
  }
}

class BuzzerStrategy implements BattleModeStrategy {
  handleSubmitAnswer(
    io: Server,
    socket: Socket,
    game: ActiveMatchState,
    payload: SubmitAnswerPayload,
  ): void {
    const playerState = game.players[socket.id];

    // 1. Validation: Is player valid and not locked out?
    if (!playerState || playerState.lockoutStatus) return;

    // 2. Authorization: Handle First-to-Buzz Lock-in
    if (!game.firstAnswerSocketId) {
      game.firstAnswerSocketId = socket.id;
      console.log(
        `[Buzzer] Player ${playerState.name} locked the buzzer for room ${game.roomId}`,
      );
    } else if (game.firstAnswerSocketId !== socket.id) {
      socket.emit("pvp:error", {
        message: "Too slow! Opponent buzzed in first.",
      });
      return;
    }

    const question = game.questions[game.currentQuestionIndex];
    if (question) {
      const isCorrect = question.correctAnswer === payload.answer;

      if (isCorrect) {
        // Logic: Correct answer wins the round immediately
        playerState.score += 100;
        playerState.currentRoundPoints = 100;

        io.to(game.roomId).emit("pvp:buzzerCorrect", {
          userId: socket.userId,
          score: playerState.score,
        });

        // Reset round state for the next question deck delivery
        game.firstAnswerSocketId = null;
        Object.values(game.players).forEach((p) => (p.lockoutStatus = false));
        game.currentQuestionIndex++;
        sendNextQuestion(io, activeMatches, game.roomId);
      } else {
        // Logic: Incorrect answer locks player out, releases buzzer for others
        playerState.lockoutStatus = true;
        playerState.currentRoundPoints = 0;
        game.firstAnswerSocketId = null; // Open the floor for others to buzz

        io.to(game.roomId).emit("pvp:buzzerWrong", { userId: socket.userId });

        // Check if everyone is now locked out
        const allLockedOut = Object.values(game.players).every(
          (p) => p.lockoutStatus,
        );
        if (allLockedOut) {
          Object.values(game.players).forEach((p) => (p.lockoutStatus = false));

          if (game.questionTimeout) {
            clearTimeout(game.questionTimeout);
            game.questionTimeout = null;
          }

          game.currentQuestionIndex++;
          sendNextQuestion(io, activeMatches, game.roomId);
        }
      }
    }
  }

  handleRoundTimeout(io: Server, game: ActiveMatchState): void {
    console.log(`[BuzzerStrategy] Round timeout for room ${game.roomId}`);
    // If no one buzzed or answered correctly, move to next question
    Object.values(game.players).forEach((p) => (p.lockoutStatus = false)); // Reset lockouts
    game.currentQuestionIndex++;
    sendNextQuestion(io, activeMatches, game.roomId);
  }
}

class PassTheQuestionStrategy implements BattleModeStrategy {
  handleSubmitAnswer(
    io: Server,
    socket: Socket,
    game: ActiveMatchState,
    payload: SubmitAnswerPayload,
  ): void {
    
    // Implement turn-based logic, passing question on failure/timeout
    // This would involve tracking whose turn it is, and if they fail, passing to the next.
    // For simplicity, let's assume a single attempt for now.
    const playerState = game.players[socket.id];
    if (playerState) {
      console.log(
      `[PassTheQuestionStrategy] Player ${playerState.name} submitted answer for question ${payload.questionId}`,
    );
      // Assuming it's their turn
      const isCorrect = Math.random() > 0.5;
      if (isCorrect) {
        playerState.score += 100;
        io.to(game.roomId).emit("pvp:playerCorrect", {
          userId: socket.userId,
          score: playerState.score,
        });
        game.currentQuestionIndex++;
        sendNextQuestion(io, activeMatches, game.roomId);
      } else {
        io.to(game.roomId).emit("pvp:playerWrong", { userId: socket.userId });
        // Logic to pass to next player
        console.log(
          `[PassTheQuestionStrategy] Player ${playerState.name} answered wrong. Passing question.`,
        );
        // This would involve updating game state to indicate next player's turn
        // and restarting a timer for them.
      }
    }
  }

  handleRoundTimeout(io: Server, game: ActiveMatchState): void {
    console.log(
      `[PassTheQuestionStrategy] Round timeout for room ${game.roomId}`,
    );
    // Logic to pass question to next player if current player times out
    // If all players fail/timeout, move to next question.
    game.currentQuestionIndex++;
    sendNextQuestion(io, activeMatches, game.roomId);
  }
}

class CoopStrategy implements BattleModeStrategy {
  handleSubmitAnswer(
    io: Server,
    socket: Socket,
    game: ActiveMatchState,
    payload: SubmitAnswerPayload,
  ): void {
    const playerState = game.players[socket.id];

    // 1. Validation
    if (!playerState || playerState.lockoutStatus) return;

    const question = game.questions[game.currentQuestionIndex];
    if (question) {
      const isCorrect = question.correctAnswer === payload.answer;
      const teamId = playerState.teamId;
      playerState.currentRoundChoice = payload.answer;

      if (isCorrect) {
        // Award 100 points to the answering player
        playerState.score += 100;
        playerState.currentRoundPoints = 100;

        io.to(game.roomId).emit("pvp:teamCorrect", {
          userId: socket.userId,
          teamId,
          score: playerState.score,
        });

        // Round End: Reset all lockouts and move to next question
        Object.values(game.players).forEach((p) => (p.lockoutStatus = false));
        game.currentQuestionIndex++;
        sendNextQuestion(io, activeMatches, game.roomId);
      } else {
        // Incorrect Answer: Team Lockout Logic
        Object.values(game.players)
          .filter((p) => p.teamId === teamId)
          .forEach((p) => (p.lockoutStatus = true));

        const opposingTeamId = teamId === "TEAM_A" ? "TEAM_B" : "TEAM_A";
        const otherTeamLockedOut = Object.values(game.players)
          .filter((p) => p.teamId === opposingTeamId)
          .every((p) => p.lockoutStatus);

        if (otherTeamLockedOut) {
          // Logic: Both teams failed the question
          io.to(game.roomId).emit("pvp:drawQuestion", {
            message: "Both teams failed. No points awarded.",
          });

          Object.values(game.players).forEach((p) => (p.lockoutStatus = false));

          if (game.questionTimeout) {
            clearTimeout(game.questionTimeout);
            game.questionTimeout = null;
          }

          game.currentQuestionIndex++;
          sendNextQuestion(io, activeMatches, game.roomId);
        } else {
          // Logic: Pass the question to the stealing team
          io.to(game.roomId).emit("pvp:questionPassed", {
            targetTeamId: opposingTeamId,
            message: `Team ${teamId} failed! Team ${opposingTeamId} has a chance to steal.`,
          });

          // Reset clock for the remaining team to have a fresh attempt
          game.questionStartTime = Date.now();
        }
      }
    }
  }

  handleRoundTimeout(io: Server, game: ActiveMatchState): void {
    console.log(`[Coop2v2Strategy] Round timeout for room ${game.roomId}`);
    // Award 0 points to players who haven't answered, aggregate team scores
    Object.values(game.players).forEach((playerState) => {
      if (!playerState.hasAnsweredCurrent) {
        playerState.currentRoundPoints = 0;
        io.to(game.roomId).emit("pvp:playerNoAnswer", {
          userId: playerState.userId,
          score: playerState.score,
        });
      }
      playerState.hasAnsweredCurrent = false;
      playerState.currentRoundChoice = null;
    });
    game.currentQuestionIndex++;
    sendNextQuestion(io, activeMatches, game.roomId);
  }
}

class SprintStrategy implements BattleModeStrategy {
  handleSubmitAnswer(
    io: Server,
    socket: Socket,
    game: ActiveMatchState,
    payload: SubmitAnswerPayload,
  ): void | boolean {
    const playerState = game.players[socket.id];
    
    if (!playerState) return;
    
    console.log(
      `[SprintStrategy] Player ${playerState?.userId} submitted answer for question ${payload.questionId}`,
    );
    
    const question = game.questions[playerState.playerQuestionIndex];
    if (!question || question.id !== payload.questionId) {
      return socket.emit("pvp:error", {
        message: "Desynchronized question deck.",
      });
    }

    // Evaluate Correctness
    const isCorrect = question.correctAnswer === payload.answer;
    const points = isCorrect ? 100 : 0;
    const velocityBonus = isCorrect && payload.responseTime < 3000 ? 25 : 0;

    playerState.score += points + velocityBonus;
    playerState.currentRoundPoints = points + velocityBonus;
    playerState.currentRoundChoice = payload.answer;
    playerState.playerQuestionIndex++;

    // Broadcast progress for real-time leaderboards
    io.to(game.roomId).emit("pvp:playerProgress", {
      userId: socket.userId,
      score: playerState.score,
      progress: playerState.playerQuestionIndex,
      total: game.questions.length,
    });

    // deliver next question immediately to this specific player (Independent Advance)
    if (playerState.playerQuestionIndex < game.questions.length) {
      const nextQuestion = game.questions[playerState.playerQuestionIndex];
      socket.emit("pvp:nextQuestion", {
        roomId: game.roomId,
        currentQuestionIndex: playerState.playerQuestionIndex,
        totalQuestions: game.questions.length,
        question: {
          id: nextQuestion.id,
          text: nextQuestion.text,
          options: nextQuestion.options,
        },
      });
    } else {
      socket.emit("pvp:raceComplete", {
        message:
          "You've reached the finish line! Waiting for others or timer...",
        finalScore: playerState.score,
      });
    }
  }

  handleRoundTimeout(io: Server, game: ActiveMatchState): void {
    // Macro modes bypass per-question tickers.
    // The match ends globally via quizTimeout handled in the match lifecycle.
    console.log(
      `[Sprint/Velocity] Bypassing micro-ticker for room ${game.roomId}.`,
    );
  }
}

class VelocityRoyaleStrategy extends SprintStrategy {
  // Velocity Royale uses the Sprint independent progress logic but operates under Royale rules
}

// Map to easily retrieve strategy instances
export const battleModeStrategies: Record<BattleMode, BattleModeStrategy> = {
  FLASH_CLASH: new FlashClashStrategy(),
  BATTLE_ROYALE: new BattleRoyaleStrategy(),
  BUZZER: new BuzzerStrategy(),
  PASS_THE_QUESTION: new PassTheQuestionStrategy(),
  COOP: new CoopStrategy(),
  SPRINT: new SprintStrategy(),
  VELOCITY_ROYALE: new VelocityRoyaleStrategy(),
};
