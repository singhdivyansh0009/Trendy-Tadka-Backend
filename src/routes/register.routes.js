import Router from "express";
import { loginUser, logoutUser, registerUser } from "../controllers/user.controllers.js";
import { upload } from "../middlewares/multer.middlewares.js"
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { reGenerateAccessToken } from "../controllers/user.controllers.js";
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

// route for the login request
router.route('/login').post(loginUser);

//route for the logout request
router.route('/logout').post(verifyJWT,logoutUser);

//route to refresh the access token
router.route('/refresh-token').post(reGenerateAccessToken);

export default router; 