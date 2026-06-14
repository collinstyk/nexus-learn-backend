import { Router } from "express";
import { getAILearningRoadmap } from "../controllers/ai.js";

const router: Router = Router();

router.route('/roadmap').get(getAILearningRoadmap);

export default router;