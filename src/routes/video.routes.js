import { uploadVideo } from "../controllers/videos.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { upload } from "../middlewares/multer.middlewares.js";
import Router from "express";
const router = Router();
// route to upload the vedio
router.route("/upload-video").post(
    verifyJWT,
    upload.fields( [{
        name : "videoFile",
        maxCount: 1
    },
    {
        name:"thumbnail",
        maxCount: 1
    }]),
   uploadVideo
)
export default router;