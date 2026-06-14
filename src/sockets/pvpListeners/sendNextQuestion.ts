import type { Server } from "socket.io";
import handleRoundTimeout from "./handleRoundTimeout.js";
// import endWholeMatch from "./endWholeMatch.js"; 

export default (io: Server, activeMatches: Map<any, any>, roomId: string) => {
  try {
    const game = activeMatches.get(roomId);
    if (!game) return console.warn(`⚠️ Room ${roomId} not found during delivery.`);

    let currentIndex = game.currentQuestionIndex;

    // 1. Authoritative Deck Exhaustion Redirect Gate
    if (currentIndex >= game.questions.length) {
      console.log(`🎴 [Deck Exhausted] Ending match ${roomId} automatically.`);
      // return endWholeMatch(io, activeMatches, roomId);
      return;
    }

    const rawQuestionData = game.questions[currentIndex];
    if (!rawQuestionData) return;

    if (game.questionTimeout) clearTimeout(game.questionTimeout);

    const isMacroTimed = game.mode === "SPRINT" || game.mode === "VELOCITY_ROYALE";

    // 2. Master Clock Allocation
    if (currentIndex === 0 && isMacroTimed) {
      const duration = game.presetConfig?.durationPerQuiz || 120;
      console.log(`⏱️ [Global Clock] Initializing ${duration}s master timer for room: ${roomId}`);
      
      game.quizTimeout = setTimeout(() => {
        // endWholeMatch(io, activeMatches, roomId);
      }, duration * 1000);
    }

    const clientQuestion = {
      id: rawQuestionData.id,
      text: rawQuestionData.text,
      options: rawQuestionData.options,
    };

    game.questionStartTime = Date.now();

    // 3. Tempo Separation Routing
    if (!isMacroTimed) {
      const seconds = game.presetConfig?.secondsPerQuestion || 15;
      game.questionTimeout = setTimeout(() => {
        handleRoundTimeout(io, activeMatches)(roomId);
      }, seconds * 1000);
    }

    if (game.status === "STARTING") {
      game.status = "ACTIVE";
    }

    // 4. Clean Within-Bounds Broadcast Delivery Gate
    io.to(roomId).emit("pvp:nextQuestion", {
      roomId: roomId,
      currentQuestionIndex: currentIndex,
      totalQuestions: game.questions.length,
      question: clientQuestion,
    });

    console.log(`Question Pushed: Sent question index ${currentIndex} to room: ${roomId}`);
  } catch (error) {
    console.error(`❌ Delivery Error: Failed to deliver next question in room ${roomId}:`, error);
  }
};