import { Subscription } from "../models/subscription.models.js";
import { ApiResponse } from "../utils/apiResponse.utils.js";
import { ApiError } from "../utils/apiErrors.utils.js";
import mongoose from "mongoose";

// to subscribe or unsubscribe the channel
const toggleSubscription = async (req,res) => {
    try{
       // get the channel whome subscribing
       const { id : channelId } = req.query;
    
       if(!channelId)
        throw new ApiError(404,"Channel is missing");

       const subscription = await Subscription.findOne({
           channel : channelId,
           subscriber : req.user._id
       })
       
       // if subscription present unsubscribe it by removing document
       if(subscription){
           await Subscription.deleteOne({_id : subscription._id});
           console.log("unsubscribed");
       }
       // else subscribe by adding document 
       else{
           await Subscription.create({
               channel : channelId,
               subscriber : req.user._id    
           })
           console.log("subscribed");
       }
       return res.status(200)
                 .json(new ApiResponse(
                    200,
                    {},
                    "subscribed sucessfully"
                 ));
    }
    catch(err){
        console.log("Error while subscribing :",err);
        if(err instanceof ApiError)
          return res.status(err.statusCode).json(err);
        return res.status(500).json({
           message : "Internal server error"
        })
    }
}

// to get subscribers list
const getSubscribersList = async (req,res) => {
    try{
      // get the data for paginate the documents
      const { page = 1, limit = 10, sortBy = "createdAt", sortType="desc"} = req.query;

      // get the user id
      const userId = req.user._id;

       // aggregation pipeline to get the subscribers data
      const pipeline = [
      // get all the documents in subscriptions schema where the user is channel
        {
          $match : {
              channel : new mongoose.Types.ObjectId(userId)
          }
        }, 
        // get the subscriber data from that documents using lookup
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscribers"
            }   
        },
        // sort with date of subscription
        {
            $sort : {
                [sortBy] : sortType === "desc" ? -1 : 1  
            }
        },
        // unwind the subscribers array 
        {
           $unwind : "$subscribers"
        },

        // group the documents with channel field
        {
            $group : {
                _id : "$channel",
                subscribers: { $push: {
                      username : "$subscribers.username",
                      fullName : "$subscribers.fullName",
                      avatar : "$subscribers.avatar",
                      createdAt : "$subscribers.createdAt"  
                  } 
               }
            }
        }
      ];

      const options = {
         page,
         limit 
      }

      const result = await Subscription.aggregatePaginate(pipeline,options);
      if(!result.totalDocs)
        throw new ApiError(404,"No subscribers found");

      return res.status(200)
                .json( new ApiResponse(
                    200,
                    result.docs[0].subscribers,
                    "subscribers list sent sucessfully"
                ))
    }catch(err){
        console.log("Error while getting subscribers list:",err);
        if(err instanceof ApiError)
            res.status(err.statusCode).json(err);
        res.status(500).json({message:"Internal server error"});
    }
}

//to get subscribed channel list
const getSubscribedChannelList = async (req,res) => {
    try{
      // get the data for paginate the documents
      const { page = 1, limit = 10, sortBy = "createdAt", sortType="desc"} = req.query;

      // get the user id
      const userId = req.user._id;

      // aggregation pipeline to get the subscribed channel data
      const pipeline = [
      // get all the documents in subscriptions schema where the user is subscriber
        {
          $match : {
              subscriber : new mongoose.Types.ObjectId(userId)
          }
        }, 
        // get the channel data from that documents using lookup
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channelSubscribed"
            }   
        },
        // sort with date of subscription
        {
            $sort : {
                [sortBy] : sortType === "desc" ? -1 : 1  
            }
        },
        // unwind the channelSubscribed array 
        {
           $unwind : "$channelSubscribed"
        },

        // group the documents with channel field
        {
            $group : {
                _id : "$subscriber",
                channelSubscribed: { $push: {
                      username : "$channelSubscribed.username",
                      fullName : "$channelSubscribed.fullName",
                      avatar : "$channelSubscribed.avatar",
                      createdAt : "$channelSubscribed.createdAt"  
                  } 
               }
            }
        }
      ];

      const options = {
         page : 1,
         limit : 10
      }
      const result = await Subscription.aggregatePaginate(pipeline,options);
      if(!result.totalDocs)
        throw new ApiError(404,"Not subscribed to any channel");

      return res.status(200)
                .json( new ApiResponse(
                    200,
                    result.docs[0].channelSubscribed,
                    "subscription list sent sucessfully"
                ))
    }catch(err){
        console.log("Error while getting channel Subscribed list:",err);
        if(err instanceof ApiError)
            return res.status(err.statusCode).json(err);
        return res.status(500).json({message:"Internal server error"});
    }
}

export {
    toggleSubscription,
    getSubscribersList,
    getSubscribedChannelList
}