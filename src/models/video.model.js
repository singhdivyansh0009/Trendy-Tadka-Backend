import mongoose, { Schema } from "mongoose";
const VideoSchema = new Schema(
    {
        vedioFile : {
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

export const Video = mongoose.model('Video',VideosSchema);