import { Router } from "express";
import {
  createComment,
  createPost,
  getForumFeed,
  getPostWithCommentsTree,
  incrementPostViews,
  togglePostLike,
} from "../controllers/forum.js";

const router: Router = Router();

// protect function

router.route("/posts").get(getForumFeed).post(createPost);

router
  .route("/post/:postId/comments")
  .get(getPostWithCommentsTree)
  .post(createComment);
router.route("/post/:postId/like").post(togglePostLike);
router.route("/post/:postId/view").patch(incrementPostViews);

export default router;
