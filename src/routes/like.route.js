import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { toggleCommentLike, toggleVideoLike } from "../controllers/like.controllers.js";
const router = Router();

// routes to like unlike video and comment
router.route("/video/:videoId").post(verifyJWT,toggleVideoLike);
router.route("/comment/:commentId").post(verifyJWT,toggleCommentLike);

export default router;