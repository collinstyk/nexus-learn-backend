import { Router } from "express";
import {
  createDirectMessageRoom,
  createGroupRoom,
  deleteRoomMessage,
  getChatHistory,
  kickRoomMember,
  markRoomAsRead,
} from "../controllers/chat.js";
import { authorizeRoomAccess } from "../middlewares/chatGuard.js";

const router: Router = Router();

// Secure all messaging entry points with your authentication filter
router.route("/rooms/dm").post(createDirectMessageRoom);
router.route("/rooms/group").post(createGroupRoom);

router.route("/rooms/:roomId/metadata", ).get(authorizeRoomAccess, (req,res) => {
    res.status(200).json({status: "Access verified", details: req.chatMembership});
});

router.route("/rooms/:roomId/messages").get(authorizeRoomAccess, getChatHistory).patch(authorizeRoomAccess, markRoomAsRead)
router.route("/rooms/:roomId/messages/:messageId").delete(authorizeRoomAccess, deleteRoomMessage)

router.route("/rooms/:roomId/kick").post(authorizeRoomAccess, kickRoomMember);

export default router;
