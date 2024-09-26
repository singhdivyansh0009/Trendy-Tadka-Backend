import mongoose from "mongoose";
import { Playlist } from "../models/playlist.models.js";
import { ApiError } from "../utils/apiErrors.utils.js"
import { ApiResponse } from "../utils/apiResponse.utils.js";
import { uploadOnCloudinary } from "../utils/cloudinary.utils.js";

// to create new playlist 
const createPlaylist = async (req,res) => {
     try {
        //get the data from the user
        const {name , description} = req.body
        console.log(req.body);
        if(!name || !description)
            throw new ApiError(400, "All field required");
        
        //check for thumbnail
        if(!req.file?.fieldname)
            throw new ApiError(400,"Thumbnail file is required");

        // get the local path
        const thumbnailLocalPath = req.file.path;
        if(!thumbnailLocalPath)
            throw new ApiError(400,"Thumbnail file is required");
        
        // upload on cloudinary
        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
        if(!thumbnail)
            throw new ApiError(400,"Thumbnail uploading unsucessfull");
        
        //create a playlist
        const playlist = await Playlist.create({
            name,
            description,
            owner : req.user._id,
            thumbnail : thumbnail.url
        });
        if(!playlist)
            throw new ApiError(401,"Playlist creation unsuccessfull");

        // sent the response
        return  res.status(200)
                   .json(new ApiResponse(
                          200,
                          playlist,
                          "Playlist create sucessfully"
                     ))
     } catch (err) {
        console.log("Error while creating playlist:",err);
        if(err instanceof ApiError)
            return res.status(err.statusCode).json(err);
        return res.status(500).json({message:"Internal server error"});
     }
}

// to update playlist 
const updatePlaylist = async (req,res) => {
    try {
        // get the playlist id and fields to update
        const {playlistId} = req.params;
        const {name , description} = req.body;

        // verify the data
        if(!name && !description)
           throw new ApiError(400,"All field required");
        if(!playlistId)
            throw new ApiError(400,"unkown request");
        
        // update and get the updated playlist
        const playlist = await Playlist.findOneAndUpdate(
            {
                _id : playlistId,
                owner : req.user?._id
            },
            {
                $set : {
                    name,
                    description
                }
            },
            {
                new:true
            }
        )
        if(!playlist)
            throw new ApiError(401,"Playlist not found");

        // send the response
        return res
               .status(200)
               .json(new ApiResponse(
                   200,
                   playlist,
                   "Playlist updated successfully"
               ))
    } catch (err) {
        console.log("Error while updating playlist:",err);
        if(err instanceof ApiError)
            return res.status(err.statusCode).json(err);
        return res.status(500).json({message:"Internal server error"});
    }
}

// to delete playlist
const deletePlaylist = async (req,res) => {
    try {
        // get the playlist id 
        const {playlistId} = req.params;
        if(!playlistId)
            throw new ApiError(400,"unkown request");
        
        // remove the playlist
        const playlist = await Playlist.findOneAndDelete(
            {
                _id:playlistId,
                owner: req.user?._id
            }
        );
        if(!playlist)
            throw new ApiError(404,"Playlist not found");

        // send the response
        return res
               .status(200)
               .json(new ApiResponse(
                   200,
                   {},
                   "Playlist deleted successfully"
               ))
    } catch (err) {
        console.log("Error while deleting playlist:",err);
        if(err instanceof ApiError)
            return res.status(err.statusCode).json(err);
        return res.status(500).json({message:"Internal server error"});
    }
}

// To add videos to playlist 
const addVideosToPlaylist = async (req, res) => {
    try {
        const { playlistId } = req.params;
        const { videoIds } = req.body; // Accept an array of video IDs from the request body
        
        if (!playlistId)
            throw new ApiError(400, "Playlist ID is missing");

        if (!videoIds || !Array.isArray(videoIds) || videoIds.length === 0)
            throw new ApiError(400, "At least one video ID is required");

        // get the playlist and add videos
        const playlist = await Playlist.findOneAndUpdate(
            {
                _id: playlistId,
                owner: req.user?._id
            },
            {
                $push: {
                    videos: { $each: videoIds } // Use $each to add multiple videos
                }
            },
            {
                new: true
            }
        );

        if (!playlist)
            throw new ApiError(404, "Playlist not found");

        return res.status(200).json(new ApiResponse(
            200,
            playlist,
            "Videos added to playlist"
        ));
    } catch (err) {
        console.log("Error while adding videos:", err);
        if (err instanceof ApiError)
            return res.status(err.statusCode).json(err);
        return res.status(500).json({ message: "Internal server error" });
    }
}


// to remove videos from playlist (Not tested)
const removeVideosFromPlaylist = async (req, res) => {
    try {
      const { videoId, playlistId } = req.params;
  
      // Validate request parameters
      if (!playlistId) {
        throw new ApiError(400, "Playlist ID is missing");
      }
      if (!videoId) {
        throw new ApiError(400, "Video ID is missing");
      }
  
      // Find the playlist and remove the video
      const playlist = await Playlist.findOneAndUpdate(
        {
          _id: playlistId,
          owner: req.user?._id,  // Ensure the owner of the playlist matches the current user
          videos: videoId  // Check if the video exists in the playlist
        },
        {
          $pull: { videos: videoId }  // Remove the video from the videos array
        },
        {
          new: true  // Return the updated playlist
        }
      );
  
      // If the playlist doesn't exist or the video isn't part of it
      if (!playlist) {
        throw new ApiError(404, "Playlist not found or video not part of playlist");
      }
  
      // Successfully removed the video from the playlist
      return res.status(200).json(
        new ApiResponse(200, playlist, "Video removed from playlist")
      );
    } catch (err) {
      console.error("Error while removing video:", err);
  
      if (err instanceof ApiError) {
        return res.status(err.statusCode).json({ message: err.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  };
  

// to get playlist by id  
const getPlaylistById = async (req,res) =>{
    try {
        // get the playlist id
        const { playlistId } = req.params;
        if(!playlistId)
            throw new ApiError(400,"Playlist is missing");

        // find the playlist and videos in it
        const playlist = await Playlist.aggregate ( [
            {
                $match : {
                    _id : new mongoose.Types.ObjectId(playlistId) 
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
                $lookup : {
                    from : "videos",
                    localField : "videos",
                    foreignField : "_id",
                    as : "playlistVideos"
                }
            },
            {
                $unwind : "$owner"
            },
            {
                $project : {
                    "owner.password": 0,
                    "owner.refreshToken":0
                }
            }
        ]);
        if(!playlist.length)
            throw new ApiError(404,"playlist not found");

        return res.status(200)
                  .json(new ApiResponse(
                    200,
                    playlist[0],
                    "Playlist fetched succesfully"
                  ));
    } catch (err) {
        console.log("Error while sending playlist:",err);
        if(err instanceof ApiError)
            return res.status(err.statusCode).json(err);
        return res.status(500).json({message:"Internal server error"});
    }
}

// to get all playlist of an user 
const getUserPlaylists = async (req,res) =>{
    try {
        // get user id
        const { userId } = req.params;
        
        if(!userId)
            throw new ApiError(400,"user is missing");
         
        const playlists = await Playlist.aggregate ( [
            {
                $match : {
                    owner : new mongoose.Types.ObjectId(userId) 
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
                $project : {
                    name : 1,
                    description : 1,
                    thumbnail : 1,
                    "owner.fullName":1,
                    "owner.avatar": 1
                }
            }
        ]);
        
        if(!playlists.length)
            throw new ApiError(404,"Playlists not found");

        return res.status(200)
                  .json(new ApiResponse(
                       200,
                       playlists,
                       "playlist fetched successfully"
                  ))
    } catch (err) {
        console.log("Error while fetching playlists:",err);
        if(err instanceof ApiError)
            return res.status(err.statusCode).json(err);
        return res.status(500).json({message:"Internal server error"});
    } 
}

export {
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideosToPlaylist,
    removeVideosFromPlaylist
}