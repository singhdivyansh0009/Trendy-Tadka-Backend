import { Router } from "express";
import { 
    addVideosToPlaylist, createPlaylist, 
    deletePlaylist, getPlaylistById, getUserPlaylists, 
    removeVideosFromPlaylist,
    updatePlaylist
} from "../controllers/playlist.controllers.js";
import { verifyJWT }from "../middlewares/auth.middlewares.js"
import { upload } from "../middlewares/multer.middlewares.js"
const router = Router();

router.route("/create-playlist").post(
    verifyJWT,
    upload.single(
        "thumbnail"
    ),
    createPlaylist
);

router.route("/:playlistId").get(getPlaylistById)
                            .patch(verifyJWT,updatePlaylist)
                            .delete(verifyJWT,deletePlaylist);
                            
router.route("/user/:userId").get(getUserPlaylists);

// routes to remove and add videos from playlist
router.route("/add/:videoId/:playlistId").post(verifyJWT,addVideosToPlaylist);
router.route("/remove/:videoId/:playlistId").post(verifyJWT,removeVideosFromPlaylist);

export default router;