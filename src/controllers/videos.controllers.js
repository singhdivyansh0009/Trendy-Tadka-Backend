import { ApiError } from "../utils/apiErrors.utils.js";
import { uploadOnCloudinary } from "../utils/cloudinary.utils.js";
import { ApiResponse } from "../utils/apiResponse.utils.js"
import fs from "fs";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.models.js";

// function to manage views
// Note : There is issue in managing the views when user clear the watch history
const manageViews = async (videoId,user) => {
    try{
      // check if the video is present in watch no need to increase view
      const isVideoPresent = user.watchHistory.find((value) => value === videoId);
      if(isVideoPresent)
         return;

      // else increase the view by 1 
      // get the video document from db
      const video = await Video.findByIdAndUpdate(
             videoId,
             {
              $inc: {
                views : 1
               }
             }
      );
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
    const { page = 1, limit = 2, sortBy = "createdAt", sortType="desc", username } = req.query;
    
    // get the value for sorting the data
    const sortOrder = sortType === "asc" ? 1 : -1;

    const options = {
      page,
      limit
    };
    
    // create an aggregation pipeline to filter the videos
    const pipeline = [
      {
          $match: username ? { username: username } : {} 
      },
      {
          $sort: {
              [sortBy]: sortOrder
          }
      },
      {
          $project: {
              videoFile: 1,
              title: 1,
              descriptions: 1,
              views: 1,
              thumbnail: 1,
              owner: 1,
              createdAt: 1
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
    const {id} = req.query;

    //get the video document for that id 
    const video = await Video.findById(id);
    if(!video)
      throw new ApiError(404,"Video not found");

    // sent the response
    return res.status(200)
              .json(new ApiResponse(
                200,
                video
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
    
    // get the user from the database
    const user = await User.findByIdAndUpdate(
      userId,
      {
        $push: {watchHistory : videoId}
      },
      {
        new : true
      }
    ).select("-password -refreshToken");
    if(!user)
      throw new ApiError(400,"Unauthorized access")

    // manage the view on video
    await manageViews(videoId,user);

    // sent response 
    return res.status(200)
              .json(new ApiResponse(
                200,
                user,
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
      const {id} = req.body;
      if(!id)
        throw new ApiError(401,"vedio id is required");

      // delete the video from the database
      const isDeleted = await Video.deleteOne(
        {
          _id : id
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