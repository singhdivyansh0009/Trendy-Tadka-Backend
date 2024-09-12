import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static("public"));
app.use(cookieParser());
// to verify
app.get('/', (req,res) =>{
     res.json({
        message : "sever deployed sucessfully"
     })
})
import userRouter from "./routes/user.routes.js";
import vedioRouter from "./routes/video.routes.js"
import subscriptionRouter from "./routes/subscription.routes.js"
import playlistRouter from "./routes/playlist.routes.js"
import commentRouter from "./routes/comment.routes.js"
import likeRouter from "./routes/like.route.js"
app.use('/api/v1/users', userRouter);  // middleware for user related routes
app.use('/api/v1/video',vedioRouter); // middleware for vedio related routes
app.use('/api/v1/subscription',subscriptionRouter); // middleware for subscription routes
app.use('/api/v1/playlist',playlistRouter); // middleware for playlist routes
app.use('/api/v1/comment',commentRouter); // middleware for comment routes
app.use('/api/v1/like',likeRouter); // middleware for Like routes
export default app;
