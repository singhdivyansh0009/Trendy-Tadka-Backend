import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/apiErrors.utils.js";
import { ApiResponse } from "../utils/apiResponse.utils.js";
import { Subscription } from "../models/subscription.models.js";

// to get subscribers statistics with dates and months
const getSubscribersGrowth = async(req, res) => {
    try {
      const channelId = req.user?._id;
  
      // Get the current date
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);
  
      // Get the subscriber count for the last 7 days
      const dailySubscribers = await Subscription.aggregate([
        {
          $match: {
            channel: channelId,
            createdAt: { $gte: sevenDaysAgo } // Filter subscribers in the last 7 days
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, // Group by day
            count: { $sum: 1 } // Count subscribers per day
          }
        },
        { $sort: { "_id": 1 } } // Sort by date ascending
      ]);
  
      // Get the subscriber count for each month
      const monthlySubscribers = await Subscription.aggregate([
        {
          $match: {
            channel: channelId
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, // Group by month
            count: { $sum: 1 } // Count subscribers per month
          }
        },
        { $sort: { "_id": 1 } } // Sort by date ascending
      ]);
  
      // Return the result
      return res.status(200).json({
        dailySubscribers,
        monthlySubscribers
      });
  
    } catch (err) {
      console.log("Error while getting subscribers growth:", err);
      if (err instanceof ApiError)
        return res.status(statusCode).json(err);
      return res.status(500).json({
        message: "Internal server error"
      });
    }
  };
  
// to get channel statistics  (BUG : if video is not uploaded ny the user it will return empty response)
const getchannelStats = async(req,res) => {
   try{
       const currentDate = new Date();
       const lastWeek = new Date(currentDate);
       lastWeek.setDate(currentDate.getHours() - 12);
       
       // get logined user 
    //    console.log(req.user);
       const userId = req.user?._id;
       if(!userId)
          throw new ApiError(401,"Unauthorized access");
    
       const videosStats = await Video.aggregate([
        { $match: { owner: userId } }, // Match documents for the specific userId
        
        // Perform a lookup to join with the likes collection
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "VideosLiked"
            }
        },
        {
            $lookup : {
                from : "subscriptions",
                localField : "owner",
                foreignField : "channel",
                as : "subscribers"
            }
        },
        
        // // Group to aggregate the data
        {
            $group: {
                _id: "$owner", // Grouping by null aggregates all matched documents
                totalVideos: { $sum: 1 }, // Count the number of videos
                totalViews: { $sum: "$views" }, // Sum up the views field
                totalLikes: { $sum: {$size :"$VideosLiked" } }, // Count the number of like documents
                totalSubscribers : {$first : {$size : "$subscribers"}}, // cout the number of subscriber                     
            }
        }
    ]);    

    if(!videosStats){
        throw new ApiError(404,"You had not uploaded any videos");
    }
    return res.status(200)
              .json(new ApiResponse(
                200,
                videosStats,
                "Channel statistics sent"
              ))


   }catch(err){
      console.log("Error while getting channel stats",err);
      if(err instanceof ApiError)
        return res.status(stausCode).json(err);
      return res.status(500).json({
        message : "Internal server"
      })
   }
}

// to get all channel videos
const getchannelVideos= async(req,res) => {
    try{
        // get logined user 
        const userId = req.user?._id;
        if(!userId)
           throw new ApiError(401,"Unauthorized access");

        // get all videos of the user (can apply pagination for more efficiency)
        const channelVideos = await Video.find({owner : userId});
      
        if(!channelVideos)
            throw new ApiError(404,"Videos not found");
        return res.status(200)
                  .json(new ApiResponse(
                            200,
                            channelVideos,
                            "Videos sent successfully"
                    ))
    }catch(err){
       console.log("Error while getting channel videos",err);
       if(err instanceof ApiError)
         return res.status(stausCode).json(err);
       return res.status(500).json({
         message : "Internal server"
       })
    }
}

export {
    getchannelStats,
    getchannelVideos,
    getSubscribersGrowth
};