import { Subscription } from "../models/subscription.models.js";
import { ApiResponse } from "../utils/apiResponse.utils.js";
import { ApiError } from "../utils/apiErrors.utils.js";

// to subscribe the channel
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
export {
    toggleSubscription
}