import Router from "express";
import { 
    changePassword,
    getUserChannelProfile, getWatchHistory, 
    loginUser, logoutUser, 
    registerUser, updateAvatar, 
    updateCoverImage, verifyOTP 
} from "../controllers/user.controllers.js";
import { upload } from "../middlewares/multer.middlewares.js"
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { reGenerateAccessToken } from "../controllers/user.controllers.js";
import { sendOtp } from "../controllers/user.controllers.js";
const router = Router(); // initializing router 

// route for the register request
router.route('/register').post(
    upload.fields( [{
        name : "avatar",
        maxCount: 1
    },
    {
        name:"coverImage",
        maxCount: 1
    }]),
    registerUser
); 

// route for the login and logout request
router.route('/login').post(loginUser);
router.route('/logout').post(verifyJWT,logoutUser);

//route to refresh the access token
router.route('/refresh-token').post(reGenerateAccessToken);

//route to sent otp and verify otp
router.route('/send-otp').post(sendOtp);
router.route('/verify-otp').post(verifyOTP);

//route to update details 
router.route('/update-avatar').post(
    verifyJWT, 
    upload.single(
      "avatar"
    ),
    updateAvatar
);

router.route('/update-cover-image').post(
    verifyJWT, 
    upload.single( 
        "coverImage"
    ),
   updateCoverImage
);

router.route('/change-password').post(verifyJWT,changePassword);

//route to get profile and watch history
router.route('/c/:username').get(verifyJWT,getUserChannelProfile);
router.route('/history').get(verifyJWT,getWatchHistory);

export default router; 