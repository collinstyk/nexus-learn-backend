import  { Router} from 'express';
import { enrollInCourse } from '../controllers/enrollment.js';
import { protect } from '../middlewares/auth.js';

const router: Router = Router();

router.use(protect);

router.route('/').post(enrollInCourse);

export default router;
