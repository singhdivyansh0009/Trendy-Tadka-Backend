import { Router } from "express";
import { getchannelStats, getchannelVideos, getSubscribersGrowth } from "../controllers/dashboard.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js"

const router = Router();

router.route("/stats").get(verifyJWT,getchannelStats);
router.route("/videos").get(verifyJWT,getchannelVideos);
router.route("/get-growth").get(verifyJWT,getSubscribersGrowth);

export default router;