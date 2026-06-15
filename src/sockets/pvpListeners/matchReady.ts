import { Server, Socket } from "socket.io";
import type { BattleMode, PlayerProfile, PresetConfig } from "../types.js";
import type { BattleMode as PrismaBattleMode } from "../../generated/enums.js";
import {
  type ActiveMatchState,
  battleModeStrategies,
} from "./battleModeStrategies.js";
import prisma from "../../prisma.js";
import sendNextQuestion from "./sendNextQuestion.js";

export default async (
  io: Server,
  socket: Socket,
  activeMatches: Map<any, any>,
  roomId: string,
  participants: PlayerProfile[],
  subjectName: string,
  mode: string,
  presetConfig: PresetConfig,
) => {
  try {
    console.log(
      `[Match Engine] Constructing question deck for Subject: ${subjectName}`,
    );

    // --- POLYMORPHIC MATRIX QUESTION FETCH ---
    const totalQuestions = presetConfig?.totalQuestions || 5; // Default to 5 questions if not specified

    // 1. First, locate the target Subject record by name
    const targetSubject = await prisma.subject.findUnique({
      where: { name: subjectName },
      include: { topics: { select: { id: true } } },
    });

    let fetchedQuestions: any[] = [];

    if (targetSubject) {
      // Gather all IDs of topics mapped under this subject umbrella
      const associatedTopicIds = targetSubject.topics.map((t: any) => t.id);

      // Query any question matching this subject directly OR linked to its child topics
      fetchedQuestions = await prisma.question.findMany({
        where: {
          OR: [
            { subjectId: targetSubject.id },
            { topicId: { in: associatedTopicIds } },
          ],
        },
      });
    }

    // --- SYSTEM FALLBACK BUFFER ---
    // If our filters come up dry, grab a random sample from the global question reserve pool
    if (!fetchedQuestions || fetchedQuestions.length < totalQuestions) {
      console.warn(
        `⚠️ Insuficient questions matched [${subjectName}]. Fetching supplementary backup pool.`,
      );

      const backupQuestions = await prisma.question.findMany({
        take: totalQuestions,
        skip: fetchedQuestions.length,
      });

      fetchedQuestions = [...(fetchedQuestions || []), ...backupQuestions];
    }

    // --- PSEUDO-RANDOM SHUFFLE REWARDS ---
    // Mix up the array and shave it down to exactly 5 round nodes
    const randomizedQuestions = fetchedQuestions
      .sort(() => 0.5 - Math.random())
      .slice(0, totalQuestions);

    if (randomizedQuestions.length === 0) {
      throw new Error(
        "Critical Failure: Question bank repository is completely empty.",
      );
    }

    // --- 1. CREATE BATTLESESSION RECORD IN DB ---
    const battleSession = await prisma.battleSession.create({
      data: {
        mode: mode as PrismaBattleMode, // Ensure mode is a valid BattleMode enum value
        status: "ACTIVE", // Initially active
      },
    });

    // --- 2. CREATE BATTLEPLAYER RECORDS IN DB ---
    const battlePlayersData = participants.map((p, index) => ({
      sessionId: battleSession.id,
      userId: p.userId,
      score: 0,
      teamId:
        mode === "COOP"
          ? index < participants.length / 2
            ? "TEAM_A"
            : "TEAM_B"
          : null,
      lockoutStatus: p.lockout || false,
    }));

    await prisma.battlePlayer.createMany({
      data: battlePlayersData,
    });

    // Construct the player map for the RAM cache
    const playerState: Record<string, any> = {};
    participants.forEach((p, index) => {
      playerState[p.socketId] = {
        userId: p.userId,
        name: p.name,
        score: 0,
        status: "ALIVE", // This is for in-memory game logic, not DB
        // Assign teamId for COOP mode. Assuming first half are Team A, second half are Team B.
        teamId:
          mode === "COOP"
            ? index < participants.length / 2
              ? "TEAM_A"
              : "TEAM_B"
            : undefined,
        lockoutStatus: p.lockout || false, // Initialize lockout status from PlayerProfile or default to false
        hasAcknowledged: false,
        hasAnsweredCurrent: false,
        currentRoundChoice: null,
        currentRoundPoints: 0,
      };
      if (p.teamId) playerState[p.socketId].teamId = p.teamId; // Assign teamId if present
    });

    // --- INITIALIZE THE SERVER REAL-TIME RAM CACHE ---
    activeMatches.set(roomId, {
      roomId: roomId,
      status: "STARTING",
      battleSessionId: battleSession.id, // Link in-memory state to DB record
      subjectName,
      mode, // Store the battle mode in the game state
      presetConfig, // Store the preset configuration
      currentQuestionIndex: 0,
      questionStartTime: null,
      firstAnswerSocketId: null,
      questions: randomizedQuestions,
      players: playerState, // Use the dynamically constructed playerState
      strategy: battleModeStrategies[mode as BattleMode], // Assign the specific strategy
      questionTimeout: null,
      quizTimeout: null,
    }); // Initialize questionTimeout to null, it will be set when the first question is sent
    // Determine the initial question timeout based on mode and presetConfig
    // This will be used by sendNextQuestion.ts

    // --- TARGETED HANDSHAKE DELIVERY TO ALL PARTICIPANTS ---
    participants.forEach((p) => {
      const fullRoster = participants.map((p) => ({
        userId: p.userId,
        socketId: p.socketId, // Extremely helpful for identifying who is who on live score updates
        name: p.name,
        score: 0, // Initialize everyone at zero on the server payload
        ...(mode === "COOP" && { teamId: p.teamId }), // Capture the assigned team
      }));

      io.to(p.socketId).emit("pvp:matchReady", {
        roomId,
        mode,
        presetConfig, // Include presetConfig in the payload
        subject: subjectName,
        players: fullRoster, // Send info about all other players
        // For 1v1, you might still want a single 'opponent' field for backward compatibility or simpler UI
        ...(participants.length === 2 && {
          opponent: fullRoster.find((other) => other.userId !== p.userId),
        }),
      });
    });

    console.log(
      `[Match Ready] Operational room ${roomId} deployed to client memory banks.`,
    );

    console.log(
      `⏱️ [Match Engine] Match ${roomId} is buffering. Starting 3-second startup clock...`,
    );
    setTimeout(() => {
      sendNextQuestion(io, activeMatches, roomId);
    }, 4000);
  } catch (error) {
    console.error(
      `[Match Engine Crash] Failed to synchronize sockets for match initialization:`,
      error,
    );
    socket.emit("pvp:error", {
      message:
        "An internal database error occurred while building your matchmaking session.",
    });
  }
};
