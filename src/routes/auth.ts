import { Router } from "express";
import { forgotPassword, handleOAuthCallback, resetPassword, unifiedLogin, unifiedSignup } from "../controllers/auth.js";

const router: Router = Router();

router.route('/signup').post(unifiedSignup);
router.route('/login').post(unifiedLogin);
router.route('/forgot-password').post(forgotPassword);
router.route('/reset-password/:token').post(resetPassword);
router.route('/oauth/callback').post(handleOAuthCallback);

export default router;