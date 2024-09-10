import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static("public"));
app.use(cookieParser());

import userRouter from "./routes/user.routes.js";
import vedioRouter from "./routes/video.routes.js"
import subscriptionRouter from "./routes/subscription.routes.js"
import playlistRouter from "./routes/playlist.routes.js"
app.use('/api/v1/users', userRouter);  // middleware for user related routes
app.use('/api/v1/video',vedioRouter); // middleware for vedio related routes
app.use('/api/v1/subscription',subscriptionRouter); // middleware for subscription routes
app.use('/api/v1/playlist',playlistRouter); // middleware for playlist routes
export default app;