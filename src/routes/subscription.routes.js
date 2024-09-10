import { Router } from "express";
import {verifyJWT} from "../middlewares/auth.middlewares.js"
import { getSubscribedChannelList, getSubscribersList, toggleSubscription } from "../controllers/subscription.controllers.js";
const router = Router();

router.route("/toggle-subscription").post(verifyJWT,toggleSubscription);

router.route("/subscribers-list").get(verifyJWT,getSubscribersList);

router.route("/subscription-list").get(verifyJWT,getSubscribedChannelList);
export default router;