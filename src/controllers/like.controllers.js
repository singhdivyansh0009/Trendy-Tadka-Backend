import { Like } from "../models/like.models.js";
import { ApiError } from "../utils/apiErrors.utils.js";
import { ApiResponse } from "../utils/apiResponse.utils.js";

// to like unlike videos
const toggleVideoLike = async (req,res) => {
    try {
        // get video id
        const { videoId } = req.params;
        
        if(!videoId)
            throw new ApiError(400,"videoId is missing");
        if(!req.user)
            throw new ApiError(400,"Unauthorized access");
        
        // unlike if user already liked
        const unLike = await Like.findOneAndDelete(
            {
                likeBy : req.user._id,
                video : videoId
            }
        );
        console.log("unlike", unLike);
        if(unLike){
            return res.status(200)
                  .json(new ApiResponse(
                       200,
                       {},
                       "video unliked"
                  ));
        }
         
        // like if user not liked that video already
        const like = await Like.create({
                likeBy : req.user?._id,
                video : videoId
            });
        console.log("like ",like);
        if(!like)
            throw new ApiError(400,"toggling like unsuccessfull");
            

        return res.status(200)
                  .json(new ApiResponse(
                       200,
                       like,
                       "video liked"
                  ));

    } catch (err) {
        console.log("Error while adding like:",err);
        if(err instanceof ApiError)
            return res.status(err.statusCode).json(err);
        return res.status(500).json({message:"Internal server error"});
    } 
}

// to like unlike comment
const toggleCommentLike = async (req,res) => {
    try {
        // get video id
        const { commentId } = req.params;
        
        if(!commentId)
            throw new ApiError(400,"commentId is missing");
        if(!req.user)
            throw new ApiError(400,"Unauthorized access");
        
        // unlike if user already liked
        const unLike = await Like.findOneAndDelete(
            {
                likeBy : req.user._id,
                comment : commentId
            }
        );
        if(unLike){
            return res.status(200)
                  .json(new ApiResponse(
                       200,
                       {},
                       "comment unliked"
                  ));
        }

        // like if user not liked already
        const like = await Like.create({
                likeBy : req.user._id,
                comment : commentId,
            });
        
        if(!like)
            throw new ApiError(400,"toggling like on comment unsuccessfull");
            

        return res.status(200)
                  .json(new ApiResponse(
                       200,
                       like,
                       "comment liked"
                  ));

    } catch (err) {
        console.log("Error while toggling like on comment:",err);
        if(err instanceof ApiError)
            return res.status(err.statusCode).json(err);
        return res.status(500).json({message:"Internal server error"});
    } 
}

export {toggleVideoLike,toggleCommentLike};