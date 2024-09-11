import mongoose, { Schema } from "mongoose";

const likeSchema = new mongoose.Schema({
      likeBy : {
        type : Schema.Types.ObjectId,
        ref : "User"
      },
      video: {
          type: Schema.Types.ObjectId,
          ref : "Video"
      },
      comment : {
          type: Schema.Types.ObjectId,
          ref : "Comment"
      }
      
},{timestamps : true});

export const Like = mongoose.model("Like",likeSchema);