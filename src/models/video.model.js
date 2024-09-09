import mongoose, { plugin, Schema } from "mongoose";
import aggregatePaginate from 'mongoose-aggregate-paginate-v2';

const VideoSchema = new Schema(
    {
        videoFile : {
            type : String,
            required : true
        },
        thumbnail : {
            type : String,
            required : true
        },
        title : {
            type : String,
            required : true
        },
        descriptions : {
            type : String,
            required : true
        },
        durations : {
            type : Number
        },
        views : {
            type : Number,
            default : 0
        },
        isPublished : {
            type : Boolean,
            default : false
        },
        owner : {
            type : Schema.Types.ObjectId,
            ref : 'User'
        }
    }, { timestamps : true}
);
VideoSchema.plugin(aggregatePaginate);
export const Video = mongoose.model('Video',VideoSchema);
