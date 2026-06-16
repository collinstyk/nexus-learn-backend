import { Router } from "express";
import { createSubject, getAllActiveSubjects } from "../controllers/subjects.js";
import { protect } from "../middlewares/auth.js";

const router: Router = Router();

router.use(protect);

/**
 * DISCOVERY ENGINE: Get all approved disciplines
 * Accessible by all authenticated users (or potentially public depending on project needs)
 */
router.route("/active").get(getAllActiveSubjects);

/**
 * CMS ENGINE: Create/Propose a new subject
 */
router.route("/").post(createSubject);

export default router;