export type BattleMode = 'FLASH_CLASH' | 'BATTLE_ROYALE' | 'SPRINT_1v1' | 'BUZZER' | 'PASS_THE_QUESTION' | 'COOP' | 'SPRINT_GRAND_PRIX' | 'SPRINT_1v1';

export interface PlayerProfile {
  socketId: string;
  userId: string;
  name: string;
  mode: BattleMode;
  teamId?: string,
  subject?: string;
  lockout?: boolean; // New: tracking buzzer penalty
}

export interface CustomLobbyState {
  roomCode: string;
  hostId: string;
  subject: string;
  mode: BattleMode;
  players: PlayerProfile[];
  teams?: {
    teamA: { players: PlayerProfile[] };
    teamB: { players: PlayerProfile[] };
  };
}

export interface PresetConfig {
  durationPerQuiz?: number;
  secondsPerQuestion?: number;
  totalQuestions: number;
  lives?: number;
}

export interface SubmitAnswerPayload {
  roomId: string;
  questionId: string;
  answer: string;
  responseTime: number;
}

export interface BuzzAttemptPayload {
  roomId: string;
}

export interface BuzzResultPayload {
  userId: string;
  success: boolean;
  message: string;
}

export interface TimerTickPayload {
  roomId: string;
  remaining: number;
}

export interface QuestionTimeoutPayload {
  roomId: string;
  playerPerformance: Record<string, {
    name: string;
    hasAnswered: boolean;
    scoreDelta: number;
  }>;
}

export interface ChatMessagePayload {
  roomId: string;
  senderId: string;
  content: string;
}

export interface ServerMessageBroadcast extends ChatMessagePayload {
  id: string;
  createdAt: string;
}