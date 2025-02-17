import mongoose, { Schema } from "mongoose";

const watchHistorySchema = new mongoose.Schema({
  user: { 
    type: Schema.Types.ObjectId, 
    ref: 'User' 
  },
  video: { 
    type: Schema.Types.ObjectId,
    ref: 'Video' 
  },
}, { timestamps: true }); 

export const History = mongoose.model('History', watchHistorySchema);
