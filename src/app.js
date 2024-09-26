import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
const app = express();
const corsOptions = {
   origin: 'http://localhost:5173', // Replace with your frontend's domain
   credentials: true // Allow cookies to be sent and received
 };
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static("public"));
app.use(cookieParser());
// base url
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
import dashboardRouter from "./routes/dashboard.routes.js"
app.use('/api/v1/users', userRouter);  // middleware for user related routes
app.use('/api/v1/video',vedioRouter); // middleware for vedio related routes
app.use('/api/v1/subscription',subscriptionRouter); // middleware for subscription routes
app.use('/api/v1/playlist',playlistRouter); // middleware for playlist routes
app.use('/api/v1/comment',commentRouter); // middleware for comment routes
app.use('/api/v1/like',likeRouter); // middleware for Like routes
app.use("/api/v1/dashboard",dashboardRouter); // middleware for dashboard

export default app;