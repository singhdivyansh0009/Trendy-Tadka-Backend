import { Comment } from "../models/comment.models.js";
import { ApiError } from "../utils/apiErrors.utils.js";
import { ApiResponse } from "../utils/apiResponse.utils.js"
import mongoose from "mongoose";
// to add comment
const addComment = async (req,res) => {
    try {
        //get the comment content from the user 
        const { content } = req.body;

        // get the videos id from params
        const { videoId }= req.params;
        if(!content || !videoId)
            throw new ApiError(400,"Missing field");

        // check for the user
        if(!req.user)
            throw new ApiError(401,"Unauthorized access");

        // create a comment
        const comment = await Comment.create({
            content,
            owner:req.user._id,
            video:videoId
        })

        if(!comment)
            throw new ApiError(401,"adding comment unsuccessfull");

        return res.status(200)
                  .json(new ApiResponse(
                    200,
                    comment,
                    "comment added successfully"
                  ))
    } catch (err) {
        console.log("Error while adding comment:",err);
        if(err instanceof ApiError)
            return res.status(err.statusCode).json(err);
        return res.status(500).json({message:"Internal server error"});
    }
}

// to remove comment 
const removeComment = async (req,res) => {
    try {
        const { commentId } = req.params;
        if(!commentId)
            throw new ApiError(400,"Missing field");
        
        if(!req.user)
            throw new ApiError("Unauthorized request");

        // find the comment and check for logined user as owner
        const comment = await Comment.findOneAndDelete(
              {
                _id : commentId,
                owner : req.user._id
              }
        );
        if(!comment)
            throw new ApiError(401,"No comment found");

        return res.status(200)
                  .json(new ApiResponse(
                    200,
                    comment,
                    "comment deleted successfully"
                  ))
    } catch (err) {
        console.log("Error while adding comment:",err);
        if(err instanceof ApiError)
            return res.status(err.statusCode).json(err);
        return res.status(500).json({message:"Internal server error"});
    }
}

// to update playlist 
const updateComment = async (req,res) => {
    try {
        const { commentId } = req.params;
        const { content } = req.body;
    
        if(!commentId || !content)
            throw new ApiError(400,"Missing field");
        
        if(!req.user)
            throw new ApiError("Unauthorized request");

        // find the comment and check for logined user as owner
        const comment = await Comment.findOneAndUpdate(
              {
                _id : commentId,
                owner : req.user._id
              },
              {
                $set : {
                    content
                }
              },
              {
                new : true
              }
        );
        if(!comment)
            throw new ApiError(401,"No comment found");

        return res.status(200)
                  .json(new ApiResponse(
                    200,
                    comment,
                    "comment updated successfully"
                  ))
    } catch (err) {
        console.log("Error while updating comment:",err);
        if(err instanceof ApiError)
            return res.status(err.statusCode).json(err);
        return res.status(500).json({message:"Internal server error"});
    }
}

// to get all comments (TODO : add like counts and is logined user liked on comment )
const getAllComments = async (req,res) => {
    try {
        // get the data from url 
        const {page = 1, limit = 10, sortType = "desc", sortBy = "createdAt" , videoId } = req.query;

        // create a aggregatin pipeline
        const pipeline = [
            {
                $match : {
                    video : new mongoose.Types.ObjectId(videoId)
                }
            }, 
            {
                $sort: {
                    [sortBy]: sortType === 'desc' ? -1 : 1
                }
            },
            {
               $lookup : {
                   from : "users",
                   localField : "owner",
                   foreignField : "_id",
                   as : "owner"
               }
            },
            {
                $unwind : "$owner" // convert the owner array to object
            },
            {
                $project : {
                    content : 1,
                    "owner.username" : 1,  // to include field inside of field wrap in quotes
                    "owner.avatar": 1
                }
            },
            
        ]
        const options = {
            page,
            limit
        }
        
        // apply pagination
        const result = await Comment.aggregatePaginate(pipeline,options);
       
        // sent the response
        return res.status(200)
                  .json( new ApiResponse(
                       200,
                       result.docs,
                       "comments fetched successfully"
                  ))
    } catch (err) {
        console.log("Error while fetching comment:",err);
        if(err instanceof ApiError)
            return res.status(err.statusCode).json(err);
        return res.status(500).json({message:"Internal server error"});
    }
}

export {
    addComment,
    removeComment,
    updateComment,
    getAllComments
}