import type { Request, Response } from "express";
import prisma from "../prisma.js";
import catchAsync from "../utils/catchAsync.js";
import { logUserActivity } from "../utils/logger.js";

/**
 * Launch a new community discussion thread
 */
export const createPost = catchAsync(async (req: Request, res: Response) => {
  const currentUserId = req.user?.id as string; // Extracted safely by your protect middleware
  const { title, content, subjectId } = req.body;

  if (!title || !content || !subjectId) {
    return res
      .status(400)
      .json({ status: "fail", message: "Missing required post parameters." });
  }

  const newPost = await prisma.post.create({
    data: {
      title,
      content,
      subjectId,
      authorId: currentUserId,
      views: 0,
    },
  });

  // TELEMENTRY HOOK: Log post creation under the active subject context
  if (currentUserId) {
    await logUserActivity(currentUserId, "POST_CREATED", {
      subjectId,
      metadata: {
        postId: newPost.id,
        title: newPost.title,
      },
    });
  }

  res.status(201).json({
    status: "success",
    data: { post: newPost },
  });
});

/**
 * Fetch the global or subject-targeted community feed
 */
export const getForumFeed = catchAsync(async (req: Request, res: Response) => {
  const subjectId = req.query.subjectId as string;

  // 🎯 Upgrade the include block inside getForumFeed:
  const posts = await prisma.post.findMany({
    where: {
      ...(subjectId && { subjectId }),
    },
    include: {
      author: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true } },
      _count: {
        select: {
          comments: true,
          likes: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json({
    status: "success",
    results: posts.length,
    data: { posts },
  });
});

/**
 * Inject a sub-reply comment into a discussion thread
 */
export const createComment = catchAsync(async (req: Request, res: Response) => {
  const currentUserId = req.user?.id;
  const { postId } = req.params as { postId: string };
  const { content, parentId } = req.body;

  if (!content || content.trim() === "") {
    return res
      .status(400)
      .json({ status: "fail", message: "Comment body cannot be blank." });
  }

  const newComment = await prisma.comment.create({
    data: {
      content,
      postId,
      authorId: currentUserId,
      ...(parentId && { parentId }),
    },
  });

  // TELEMENTRY HOOK: Look up the parent post context to grab the subject for the ledger
  const parentPost = await prisma.post.findUnique({
    where: { id: postId },
    select: { subjectId: true },
  }) as { subjectId: string };

  if (currentUserId && parentPost) {
    await logUserActivity(currentUserId, 'COMMENT_CREATED', {
      subjectId: parentPost.subjectId,
      metadata: {commentId: newComment.id, postId, isNestedReply: !!parentId}
    })
  }

  res.status(201).json({
    status: "success",
    data: { comment: newComment },
  });
});

/**
 * Get Single Post Thread with Reassembled Recursive Comments Tree
 */
export const getPostWithCommentsTree = catchAsync(
  async (req: Request, res: Response) => {
    const { postId } = req.params as { postId: string };

    // 1. Grab all comments for this post in a high-speed flat batch pull
    const flatComments = await prisma.comment.findMany({
      where: { postId },
      include: {
        author: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // 2. Map structures to allow instant lookup references
    const commentMap: { [key: string]: any } = {};
    flatComments.forEach((comment: any) => {
      commentMap[comment.id] = { ...comment, replies: [] };
    });

    const rootComments: any[] = [];

    // 3. The Reassembly Loop: Construct the structural branches in memory
    flatComments.forEach((comment: any) => {
      const mappedComment = commentMap[comment.id];
      if (comment.parentId) {
        // If it has a parent, push this comment into its parent's pre-allocated replies bucket
        if (commentMap[comment.parentId]) {
          commentMap[comment.parentId].replies.push(mappedComment);
        }
      } else {
        // If it has no parent, it is a primary top-level discussion comment
        rootComments.push(mappedComment);
      }
    });

    res.status(200).json({
      status: "success",
      data: { commentsTree: rootComments },
    });
  },
);

/**
 * Toggle a Post Like (Idempotent Vote Buffer)
 */
export const togglePostLike = catchAsync(
  async (req: Request, res: Response) => {
    const currentUserId = req.user?.id as string;
    const { postId } = req.params as { postId: string };

    // 1. Check if this student has already registered a like on this post
    const existingLike = await prisma.postLike.findUnique({
      where: {
        userId_postId: {
          postId: postId,
          userId: currentUserId,
        },
      },
    });

    if (existingLike) {
      // 2. Unlike: If it exists, the user clicked it again, so remove it
      await prisma.postLike.delete({
        where: {
          userId_postId: {
            postId: postId,
            userId: currentUserId,
          },
        },
      });

      return res.status(200).json({ status: "success", action: "unliked" });
    }

    // 3. Like: If it doesn't exist, record the new unique like entry
    await prisma.postLike.create({
      data: {
        postId: postId,
        userId: currentUserId,
      },
    });

    res.status(200).json({ status: "success", action: "liked" });
  },
);

/**
 * Atomic View Incrementer
 */
export const incrementPostViews = catchAsync(
  async (req: Request, res: Response) => {
    const { postId } = req.params as { postId: string };

    // Perform an atomic database increment operation (prevents race conditions)
    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        views: {
          increment: 1,
        },
      },
      select: { id: true, views: true },
    });

    res.status(200).json({
      status: "success",
      data: { views: updatedPost.views },
    });
  },
);
