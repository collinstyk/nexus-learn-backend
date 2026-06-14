import { Router } from "express";
import {
  createCourse,
  getCourses,
  getCourseResources,
  updateCourse,
  createModule,
  createCourseResource,
  updateResource,
  getCourseSyllabus,
  getSingleCourseResource,
  deleteCourse,
} from "../controllers/course.js";
import { authorizeCourseAccess } from "../middlewares/courseGuard.js";
import { protect } from "../middlewares/auth.js";

const router: Router = Router();

router.use(protect);

router.route("/create").post(createCourse);
router.route("/:id").patch(updateCourse);
router.route("/:id").delete(deleteCourse);
router.route("/").get(getCourses);

router
  .route("/:courseId/resources")
  .get(authorizeCourseAccess, getCourseResources);
router
  .route("/:courseId/resources/create")
  .get(authorizeCourseAccess, createCourseResource);
router
  .route("/:resourceId/resources")
  .get(authorizeCourseAccess, getSingleCourseResource);
router
  .route("/:resourceId/resources/update")
  .get(authorizeCourseAccess, updateResource);

router.route(":courseId/module/create").post(createModule);

router.route("/:courseId/syllabus").get(getCourseSyllabus);

// router.route()

export default router;
