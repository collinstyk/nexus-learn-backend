import { Router } from "express";
import { getActivityLedger } from "../controllers/analytics.js";
import { getUserPerformanceMetrics } from "../utils/logger.js";

const router: Router = Router();

// router.use(protect);

router.route("/ledger").get(getActivityLedger);

router.route("/performance").get(getUserPerformanceMetrics);

export default router;
