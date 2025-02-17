import { ApiError } from "../utils/apiErrors.utils.js";
import { uploadOnCloudinary } from "../utils/cloudinary.utils.js";
import { ApiResponse } from "../utils/apiResponse.utils.js"
import fs from "fs";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.models.js";
import mongoose from "mongoose";
import {History} from "../models/watchHistory.models.js"
// import { getLikeCount } from "./like.controllers.js";

// function to get the time diffrence 
const getTimeDifference = (createdAt) => {
  // get the current time
  const now = new Date();

  // get the diffrence between the document creation time and current time
  const differenceInMilliseconds = now - createdAt;
  // convert in all time format
  const differenceInSeconds = Math.floor(differenceInMilliseconds / 1000);
  const differenceInMinutes = Math.floor(differenceInMilliseconds / (1000 * 60));
  const differenceInHours = Math.floor(differenceInMilliseconds / (1000 * 60 * 60));
  const differenceInDays = Math.floor(differenceInMilliseconds / (1000 * 60 * 60 * 24));
  
  return {
      differenceInSeconds,
      differenceInMinutes,
      differenceInHours,
      differenceInDays,
  };
};

// function to manage views
const manageViews = async (videoId,userId) => {
    try{  
      const history = await History.findOne({user:userId,video:videoId});
      // console.log('history',history);
      if(history)
         return;

      const video = await Video.findByIdAndUpdate(
             videoId,
             {
              $inc: {
                views : 1
               }
             }
      );
      // console.log(video);
      if(!video)
        throw new ApiError(404,"video not found");
      
    }catch(err){
      console.log("Error while increasing the views :",err);
      if(err instanceof ApiError)
        return res.status(err.statusCode).json(err);
      return res.status(500).json({
         message : "Internal server error"
      })
    }
}
// To upload the video
const uploadVideo = async (req,res) => {
    try{
      console.log(req.files);
      // get the vedio related data from user
      const {title,descriptions} = req.body;
      if((!title) || !(descriptions))
        throw new ApiError(400,"All field are required");

      // check for vedio file
      if(!req.files?.videoFile)
        throw new ApiError(400,"Video file is required");
      const videoLocalPath = req.files.videoFile[0]?.path;

      //check for thumbnail
      if(!req.files.thumbnail)
        throw new ApiError(400,"Thumbnail file is required");
      const thumbnailLocalPath = req.files.thumbnail[0]?.path;

      // get the user from request variable because user is logged in
      const userId = req.user?._id;
      if(!userId)
        throw new ApiError(401,"Unauthorized request");

      // upload the video and thumbnail on cloudinary
      const videoFile = await uploadOnCloudinary(videoLocalPath);
      const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
     
      if(!videoFile || !thumbnail){
          fs.unlinkSync(videoLocalPath);
          fs.unlinkSync(thumbnailLocalPath);
          throw new ApiError(400,"Vedio and thumbnail is required");
      }

      // save all the data in database
      const video = await Video.create({
            title,
            descriptions,
            videoFile:videoFile.url,
            thumbnail:thumbnail.url,
            isPublished : true,
            owner : userId
      });

      // sent the response to the user
      return res
            .status(200)
            .json(new ApiResponse(
                 200,
                 video,
                 "Video uploaded successfully"    
            ))
    }catch(err){
        console.log("Error while uploading the videos :",err);
        if(err instanceof ApiError)
           return res.status(err.statusCode).json(err);
        return res.status(500).json({
            message : "Internal server error"
        })
    }
}

// To get the videos
// Example url : http://example.com/videos?username=""&page=1&limit=3
const getVideos = async(req,res) => {
  try{
    // get the data from the query of the url
    const { page = 1, limit = 9, sortBy = "createdAt", sortType="desc", userId } = req.query;
    
    // get the value for sorting the data
    const sortOrder = sortType === "asc" ? 1 : -1;

    const options = {
      page,
      limit
    };
    
    // create an aggregation pipeline to filter the videos
    const pipeline = [
      {
          $match: userId ? { owner : new mongoose.Types.ObjectId(userId) } : {} 
      },
      {
          $sort: {
              [sortBy]: sortOrder
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
        $unwind : "$owner"
      },
      {
        $addFields: {
          timeSinceCreated: {
            $divide: [
              { $subtract: [new Date(), "$createdAt"] }, // Current time - createdAt
              1000 // Convert milliseconds to seconds
            ]
          }
        }
      },
      {
        $project: {
          videoFile: 1,
          title: 1,
          descriptions: 1,
          views: 1,
          thumbnail: 1,
          "owner.fullName": 1,
          "owner.avatar": 1,
          "owner.username": 1,
          "owner._id": 1,
          createdAt: 1,
          timeSinceCreated: 1 // Include the new field in the result
        }
      }
    ];
  
    // get the limited documents as per option and pipeline 
    const result = await Video.aggregatePaginate(pipeline, options);

    // sent the result to the client
    return res.status(200)
              .json(new ApiResponse(
                     200,
                     result,
                     "Video sent successfully"
               ));

  }catch(err){
    console.log("Error while sending videos :",err);
    if(err instanceof ApiError)
      return res.status(err.statusCode).json(err);
    return res.status(500).json({
       message : "Internal server error"
    })
  }
}

// to get the single video
const getVideoById = async(req,res) => {
  try{
    // get the id of video
    const {id} = req.params;
    
    //get the video document for that id 
    const video = await Video.aggregate([
        {
          $match : {
            _id : new mongoose.Types.ObjectId(id)
          },
        },
        {
          $lookup : {
             from : "likes",
             localField : "_id",
             foreignField : "video",
             as : "likes"
          },
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
          $lookup : {
            from : 'subscriptions',
            localField: 'owner',
            foreignField: 'channel',
            as : "subscribers"
          }
        },
        {
           $unwind : "$owner"
        },
        {
            $addFields:{
              likeCount : {
                 $size: "$likes"
              },
              isLiked : {
                $in: [req.user?._id, "$likes.likeBy"]
              },
              subscriberCount : {$size : "$subscribers"},
              isSubscribed : {
                $cond: {
                    if : {$in : [req.user?._id,"$subscribers.subscriber"]},
                    then : true,
                    else : false
                }
             }
          }
        },
        {
            $project : {
            "owner.password": 0,
            "owner.refreshToken":0,
            }
        }
        
    ]);

    if(!video)
      throw new ApiError(404,"Video not found");
  

    // sent the response
    return res.status(200)
              .json(new ApiResponse(
                200,
                video,
              ))

  }catch(err){
    console.log("Error while getting the video :",err);
    if(err instanceof ApiError)
      return res.status(err.statusCode).json(err);
    return res.status(500).json({
       message : "Internal server error"
    })
  }
}

// To add in watchHistory
const addToWatchHistory = async(req,res) => {
  try{
    //get the video id from the query of url
    const { id : videoId } = req.query;
    
    if(!videoId)
      throw new ApiError(401,"Unaccessable request");
    
    // get the user id from request if logged in
    const userId = req.user?._id;
    if(!userId)
       throw new ApiError(400,"Unauthorized access");
    
    // manage the view on video
    await manageViews(videoId,userId);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Check if history exists for the same user, video, and day
    const isHistory = await History.findOneAndUpdate(
    {
      user: userId,
      video: videoId,
      createdAt: { $gte: startOfDay, $lte: endOfDay } // Same day check
    },
    { $set: { updatedAt: Date.now() } }, // Update time
    { new: true }
    );

   // If no history found, create a new entry
  let history = isHistory;
  if (!isHistory) {
     history = await History.create({
      user: userId,
      video: videoId
    });
    if(!history)
      throw new ApiError(400,"Error while added to watch History");
 }
    
    return res.status(200)
              .json(new ApiResponse(
                200,
                history,
                "Video added to watch history successfully"
              ))
  }catch(err){
    console.log("Error while adding to watchHistory :",err);
    if(err instanceof ApiError)
      return res.status(err.statusCode).json(err);
    return res.status(500).json({
       message : "Internal server error"
    })
  }
}

// to delete the video
const deleteVideo = async(req,res) => {
   try{
      // get the video id
      const {videoId} = req.query;
      if(!videoId)
        throw new ApiError(401,"vedio id is required");

      // delete the video from the database
      const isDeleted = await Video.deleteOne(
        {
          _id : videoId
        }
      )
      if(!isDeleted)
        throw new ApiError(400,"Video deletion unsucessful");
      return res
             .status(200)
             .json( new ApiResponse(
                 200,
                 {},
                 "Video deleted sucessfully"
             ))
   }catch(err){
    console.log("Error while deleting the video :", err);
    if(err instanceof ApiError)
      return res.status(err.statusCode).json(err);
    return res.status(500).json({
       message : "Internal server error"
    })
   }
}

export {
    uploadVideo,
    getVideos,
    addToWatchHistory,
    getVideoById,
    deleteVideo
};
