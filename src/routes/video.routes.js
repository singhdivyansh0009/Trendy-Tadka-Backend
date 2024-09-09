import { 
     addToWatchHistory, deleteVideo,
     getVideoById, getVideos, 
     uploadVideo 
} 
from "../controllers/videos.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { upload } from "../middlewares/multer.middlewares.js";
import Router from "express";
const router = Router();
// route to upload the video
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
// route to get the videos
router.route("/get-videos").post(getVideos);

//route to get video by id
router.route("/get-video-by-id").post(getVideoById);

//route to add to watch history
router.route("/add-to-watch-history").post(verifyJWT,addToWatchHistory);

//route to delete the video
router.route("/delete-video").post(verifyJWT,deleteVideo);
export default router;