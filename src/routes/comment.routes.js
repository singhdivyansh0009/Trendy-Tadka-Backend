import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js"
import { addComment, getAllComments, removeComment, updateComment } from "../controllers/comment.controllers.js";

const router = Router();
router.route("/video/:videoId").post(verifyJWT,addComment);
router.route("/video").get(getAllComments);
router.route("/:commentId").patch(verifyJWT,updateComment)
                           .delete(verifyJWT,removeComment);
        
export default router;