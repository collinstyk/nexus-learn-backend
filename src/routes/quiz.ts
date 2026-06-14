import { Router } from "express";
import { getQuizTree, submitQuizAnswers } from "../controllers/quiz.js";

const router: Router = Router();

router.route('/:quizId').get(getQuizTree);

router.route(':quizId/submit').post(submitQuizAnswers);

export default router;