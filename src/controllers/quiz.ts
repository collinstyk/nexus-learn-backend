import type { NextFunction, Request, Response } from "express";
import prisma from "../prisma.js";
import catchAsync from "../utils/catchAsync.js";
import { logUserActivity } from "../utils/logger.js";
import type { Question } from "../generated/prisma/client.js";
import AppError from "../utils/appError.js";

interface QuizOptionPayload {
  id: string;
  text: string;
  isCorrect?: boolean;
}

/**
 * CBT ENGINE: Create a dynamic, randomized practice quiz deck
 */
export const createRandomQuiz = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { subjectId, courseId, numQuestions, durationSeconds } = req.body;

  if ((!subjectId && !courseId) || !numQuestions) {
    return next(new AppError("Missing required parameter vectors (subjectId or courseId) or numQuestions value.", 400));
  }

  const limit = Number(numQuestions);

  // 1. Fetch matching polymorphic questions from the requested scope
  // If courseId is provided, we match on courseId. Otherwise, we match on subjectId.
  const sourceQuestions = await prisma.question.findMany({
    where: courseId ? { courseId } : { subjectId },
    select: {
      id: true,
      text: true,
      options: true,
      subjectId: true,
      courseId: true,
      topicId: true
    }
  });

  if (sourceQuestions.length === 0) {
    return next(new AppError("No questions found matching the requested scope criteria.", 404));
  }

  // 2. High-Velocity Array Shuffling Mechanism (Fisher-Yates)
  const shuffled = [...sourceQuestions] as Record<string, any>;
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Slice down to the requested size
  const selectedQuestions = shuffled.slice(0, limit);

  // 3. SECURITY LOCK: Mask the correct answers before shipping to the client console
  const secureQuestions = selectedQuestions.map((question: any) => {
    const rawOptions = (question.options as unknown as QuizOptionPayload[]) || [];
    
    const maskedOptions = rawOptions.map(opt => ({
      id: opt.id,
      text: opt.text
    }));

    return {
      id: question.id,
      text: question.text,
      subjectId: question.subjectId,
      courseId: question.courseId,
      topicId: question.topicId,
      options: maskedOptions // Golden key is safe inside the database matrix!
    };
  });

  return res.status(200).json({
    status: "success",
    message: "Randomized custom workspace deck generated successfully.",
    data: {
      durationSeconds: durationSeconds || 600, // 10 mins fallback
      totalQuestions: secureQuestions.length,
      questions: secureQuestions
    }
  });
});

/**
 * Pull secure quiz modules for the frontend layout
 */
export const getQuizTree = catchAsync(async (req: Request, res: Response) => {
  const { quizId } = req.params as {quizId: string};

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: true
    }
  });

  if (!quiz) {
    return res.status(404).json({ status: "fail", message: "Quiz module not found." });
  }

  // SECURITY LOCK: Loop through the questions and mask the options array at runtime
  const secureQuestions = quiz.questions.map((question: Question) => {
    const rawOptions = (question.options as unknown as QuizOptionPayload[]) || [];
    
    // Create a new array that completely omits the "isCorrect" validation boolean
    const maskedOptions = rawOptions.map(opt => ({
      id: opt.id,
      text: opt.text
    }));

    return {
      id: question.id,
      text: question.text,
      subjectId: question.subjectId,
      options: maskedOptions // Safe options payload injected!
    };
  });

  res.status(200).json({
    status: "success",
    data: {
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        questions: secureQuestions 
      }
    }
  });
});

/**
 * Server-Side Grading Engine & Telemetry Hook
 */
export const submitQuizAnswers = catchAsync(async (req: Request, res: Response) => {
  const currentUserId = req.user?.id;
  const { quizId } = req.params as {quizId: string};
  const { submissions, durationSeconds, subjectId } = req.body; 
  // submissions format: [{ questionId: "q1", selectedOptionId: "opt-4b" }]

  if (!submissions || !Array.isArray(submissions)) {
    return res.status(400).json({ status: "fail", message: "Invalid quiz selections payload." });
  }

  // Fetch the absolute truth keys from the database for verification
  const accurateQuestions = await prisma.question.findMany({
    where: { quizId },
  });

  let totalCorrect = 0;
  const totalQuestions = accurateQuestions.length;

  // Cross-reference student submissions against golden key parameters
  submissions.forEach(sub => {
    const targetQuestion = accurateQuestions.find((q: Question)=> q.id === sub.questionId);
    if (targetQuestion) {
      const rawOptions = (targetQuestion.options as unknown as QuizOptionPayload[]) || [];
      const correctOption = rawOptions?.find((opt: any) => opt.isCorrect);
      if (correctOption && correctOption.id === sub.selectedOptionId) {
        totalCorrect++;
      }
    }
  });

  // Compute structural score percentages
  const finalScorePercent = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  // TELEMETRY HOOK: Commit performance straight into your ledger's top-level analytics columns!
  if (currentUserId) {
    await logUserActivity(currentUserId, "QUIZ_COMPLETED", {
      subjectId: subjectId || accurateQuestions[0]?.subjectId,
      score: finalScorePercent,
      durationSeconds: durationSeconds || 0,
      metadata: { quizId, totalQuestions, totalCorrect }
    });
  }

  res.status(200).json({
    status: "success",
    data: {
      totalQuestions,
      totalCorrect,
      score: finalScorePercent,
    }
  });
});

/**
 * CBT ENGINE: Dynamic Grading Engine for Randomized/Practice Decks
 */
export const submitDynamicQuizAnswers = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const currentUserId = req.user?.id;
  const { submissions, durationSeconds, subjectId } = req.body;
  // submissions format: [{ questionId: "q1", selectedOptionId: "opt-4b" }]

  if (!submissions || !Array.isArray(submissions) || submissions.length === 0) {
    return next(new AppError("Invalid quiz selections payload. Expected array matrix.", 400));
  }

  // 1. Gather all unique submitted question IDs to fetch keys efficiently in one pass
  const targetQuestionIds = submissions.map(sub => sub.questionId);

  const accurateQuestions = await prisma.question.findMany({
    where: { id: { in: targetQuestionIds } }
  });

  let totalCorrect = 0;
  const totalQuestions = accurateQuestions.length;

  // 2. Perform the server-side validation grading loop
  submissions.forEach(sub => {
    const targetQuestion = accurateQuestions.find(q => q.id === sub.questionId);
    if (targetQuestion) {
      const rawOptions = (targetQuestion.options as unknown as QuizOptionPayload[]) || [];
      const correctOption = rawOptions.find(opt => opt.isCorrect);
      
      if (correctOption && correctOption.id === sub.selectedOptionId) {
        totalCorrect++;
      }
    }
  });

  const finalScorePercent = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  // 3. TELEMETRY HOOK: Log practice metrics inside the database activity tracker
  if (currentUserId) {
    // Attempt to auto-derive target context anchor if missing
    const computedSubjectId = subjectId || accurateQuestions[0]?.subjectId || null;

    // Build standard structure to match ActivityType.CBT
    await prisma.activityLog.create({
      data: {
        userId: currentUserId,
        activityType: "CBT",
        action: `Practice Quiz Finished: ${finalScorePercent}%`,
        subjectId: computedSubjectId,
        score: finalScorePercent,
        durationSeconds: durationSeconds || 0,
        metadata: JSON.stringify({ totalQuestions, totalCorrect })
      }
    });
    
    // Perform an inline user profile XP reward update for gamification metrics!
    if (finalScorePercent >= 50) {
      await prisma.user.update({
        where: { id: currentUserId },
        data: {
          xp: { increment: finalScorePercent } // Boost user level score
        }
      });
    }
  }

  // 4. Return results immediately back down the pipe
  return res.status(200).json({
    status: "success",
    message: "Dynamic grading matrix calculation complete.",
    data: {
      totalQuestions,
      totalCorrect,
      score: finalScorePercent
    }
  });
});