import { Router } from "express";
import {verifyJWT} from "../middlewares/auth.middlewares.js"
import { toggleSubscription } from "../controllers/subscription.controllers.js";
const router = Router();

router.route("/toggle-subscription").post(verifyJWT,toggleSubscription);

export default router;