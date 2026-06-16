import { Router } from "express";
import { createTopic, getAllTopics } from "../controllers/topic.js";
import { protect } from "../middlewares/auth.js";

const router: Router = Router();

router.use(protect);

router.route("/").get(getAllTopics).post(createTopic);

export default router;