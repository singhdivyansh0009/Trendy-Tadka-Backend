import { ApiError } from "../utils/apiErrors.utils.js";
import { uploadOnCloudinary } from "../utils/cloudinary.utils.js";
import { ApiResponse } from "../utils/apiResponse.utils.js"
import fs from "fs";
import { Video } from "../models/video.model.js";

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
export {
    uploadVideo
};