import { User } from "../models/user.models.js"
import {ApiError} from "../utils/apiErrors.utils.js"
import { ApiResponse } from "../utils/apiResponse.utils.js";
import { uploadOnCloudinary } from "../utils/cloudinary.utils.js";
import jwt from "jsonwebtoken";
import fs from "fs";
import { genrateOtp } from "../utils/otp.utils.js";
import { sendEmail } from "../utils/email.utils.js";
import mongoose from "mongoose";
import {History} from "../models/watchHistory.models.js"

// function to genrate access and refresh token
const genrateTokens = async (user) => {
    try {
      // genrate tokens 
      const accessToken = user.genrateAccessToken();
      const refreshToken = user.genrateRefreshToken();

      // save the refreshToken
      user.refreshToken = refreshToken;
      await user.save({validateBeforeSave : false});

      return { accessToken, refreshToken }
    } catch (error) {
       console.log("Error while genrating token :",error);
    }
     
}
// function to handle the register request
const registerUser = async (req,res) =>{
       try{
            // get data from frontEnd
            const {fullName,email,username,password} = req.body;  
            
            //validate the data 
            if( [fullName,email,username,password].some((fields)=> fields?.trim() === "") ){
               throw new ApiError(400,"All field is required");
            }
            console.log(req.files);
            // check for the files
            if(!req.files?.avatar)
               throw new ApiError(400,"Avatar is required");

            const avatarLocalPath = req.files?.avatar[0]?.path;
            let coverImageLocalPath;
            
            if(req.files.coverImage) 
               coverImageLocalPath = req.files.coverImage[0].path;
         
            if(!avatarLocalPath){
                throw new ApiError(400,"Avatar is required");
            }

             // check if already exists or not
             const existingUser = await User.findOne({
               $or: [{username},{email}]
            })
            
            if(existingUser){
               fs.unlinkSync(avatarLocalPath);
               if(coverImageLocalPath)
                  fs.unlinkSync(coverImageLocalPath);
               throw new ApiError(409,"user already exist");
            }

            // if present push that on cloudinary
            const avatar = await uploadOnCloudinary(avatarLocalPath);
            const coverImage = await uploadOnCloudinary(coverImageLocalPath);
            if(!avatar){
                throw new ApiError(400,"Avatar is required");
            }

            // create an object to store in db
            const user = await User.create({
                 fullName,
                 email,
                 username,
                 password,
                 avatar: avatar.url,
                 coverImage : coverImage?.url || ""
            })
            
            if(!user)
               throw new ApiError(500,"Internal server error");

            // removing password and refreshToken for saftey
            const safeUser = user.toObject(); // convert the mongoose document in plain js object
            delete safeUser["password"];
            delete safeUser["refreshToken"];
        
            // send the response to the client
            return res.status(201).json(new ApiResponse(200,safeUser,"user registered sucessfully"));
         
       }catch(err){
          console.error("Error while registering :",err);
          // if its api error
          if (err instanceof ApiError) {
            return res.status(err.statusCode).json(err);
          }
          // Handle other errors
          res.status(500).json({ message: "Internal Server Error" });
          
       }
}

const loginUser = async (req,res) => {
      try{
        // get data from frontend
        const {email, username, password} = req.body;
        
      // Validate that at least one of email or username is provided
      if (email?.trim() === "" && username?.trim() === "") {
         throw new ApiError(400, "Either email or username is required");
      }

      // Check if the user exists with either the provided username or email
      const user = await User.findOne({
         $or: [
             { username: username?.trim() }, 
             { email: email?.trim() }
            ]
      });
      
      if (!user) {
         throw new ApiError(404, "User not found");
      }
      
        // check if the password is matched or not
        const isPasswordValid = await user.isPasswordCorrect(password)
        if(!isPasswordValid)
           throw new ApiError(401,"Incorrect password");

        // genrate access and refresh token
        const {accessToken,refreshToken} = await genrateTokens(user);
        
        // removing password and refreshToken for saftey
        const loggedInUser = user.toObject(); // convert the mongoose document in plain js object
        delete loggedInUser["password"];
        delete loggedInUser["refreshToken"];

        // send the token to cookies and response to client
        const options = {
           httpOnly: true,  // can only modified through server
           secure: true,  // uncomment in production
           sameSite: 'None'
        }
        return res
               .status(200)
               .cookie("accessToken",accessToken,options)
               .cookie("refreshToken",refreshToken,options)
               .json(
                  new ApiResponse(
                     200,
                     loggedInUser,
                     "User logged in successfully"
                  )
               );
      }
      catch(err){
          console.log("Error while login :",err);
          // if its api error
          if (err instanceof ApiError) {
            return res.status(err.statusCode).json(err);
          }
          // Handle other errors
          res.status(500).json({ message: "Internal Server Error" });
      }
}
// function to logout the user
const logoutUser = async (req,res) => {
   try{
      // get the user from database using user set on req by verifyJWT middleware
      await User.findByIdAndUpdate(req.user._id,{
          $unset : {
            refreshToken : 1
         }
      })
      // clear the cookies and return the response to the user
      const options = {
         httpOnly : true,
         secure : true
      }
      return res
            .status(200)
            .clearCookie("accessToken",options)
            .clearCookie("refreshToken",options)
            .json(new ApiResponse(
               200,
               {},
               "User logged out successfully",
            ))
   }catch(err){
      console.log("Error while logging out :",err);
      // if its api error
      if (err instanceof ApiError) {
         return res.status(err.statusCode).json(err);
       }
       // Handle other errors
       res.status(500).json({ message: "Internal Server Error" });
   }

}

//function to re genrate the access token if expired
const reGenerateAccessToken = async (req,res) => {
   try{
        // get the refresh token from the cookies 
        const incomingRefreshToken = req.cookies?.refreshToken;

        // if refreshToken is not present sent error response
        if(!incomingRefreshToken)
          new ApiError(401, "unauthorized access");
        
        // verify the refresh token
        const decodedData = await jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET);

        // get the user from db and verify the refreshToken
        const user = User.findById(decodedData._id).select("-password -refreshToken");
        if(!user)
          new ApiError(409,"Invalid refresh token");
         
        if(incomingRefreshToken != user.refreshToken)
          new ApiError(409,"Refresh token is expired");
         
        // generate the access token and refresh token
        const {accessToken,refreshToken} = await genrateTokens(user);

        // send the access token and response to the user
        const options = {
          httpOnly : true,
          secure : true
        }
        return res
               .status(200)
               .cookie("accessToken",accessToken,options)
               .cookie("refreshToken",refreshToken,options)
               .json(new ApiResponse(
                  200,
                  user,
                  "Access token genrated"
               ));


   }catch(err){
      console.log("Error while refreshing the access Token :",err);
      // if its api error
      if (err instanceof ApiError) {
         return res.status(err.statusCode).json(err);
       }
       // Handle other errors
       res.status(500).json({ message: "Internal Server Error" });
   }
}

//function to change password
const changePassword = async (req,res) =>{
   try{
      // get the old password and new password from the user
      const {oldPassword,newPassword} = req.body;

      // get the user id from the user stored in request object that is added during login
      const userId = req.user?._id;
      if(!userId)
         throw new ApiError(401,"Unathorized request");

      // get the user from database 
      const user = await User.findById(userId);
      if(!user)
         throw new ApiError(404,"User not found");

      //verify the oldPasssword
      const isValid = user.isPasswordCorrect(oldPassword);
      if(!isValid)
         throw new ApiError('401',"Invalid old password");

      //update the old password and save to the document
      user.password = newPassword;
      await user.save({validateBeforeSave : false});
      
      return res.status(200).json(new ApiResponse(
         200,
         {},
         "Password changed successfully"
      ))

   }catch(err){
      console.log("Error while changing password :",err);
      if(err instanceof ApiError)
         return res.status(err.statusCode).json(err);
      res.status(500).json({ message: "Internal Server Error" });
   }
}
//function for sent otp (Note : logic for otp expiry is not written)
const sendOtp = async (req,res) =>{
   try{
   // get the email from user
   const {email} = req.body;

   // get the user from database
   const user = await User.findOne({email});
   if(!user)
      throw new ApiError(404,"Email not registered");

   // genrate the otp
   const otp = await genrateOtp();
   // save the otp in db
   user.otp = otp;
   await user.save({validateBeforeSave : false});
   // send the otp to user via email
   const message = {
      subject : "OTP for login",
      text : `Your OTP is ${otp} `,
   }
   const mailResponse = await sendEmail("Divyansh","tadkatrendy1@gmail.com",email,message);
   if(!mailResponse)
      throw new ApiError(500,"Failed to send OTP");
   // send the response
   return res.status(200).json(new ApiResponse(
      200,
      {},
      "otp sent successfully"
   ))
 }catch(err){
   console.log("Error while sending otp :",err);
   if(err instanceof ApiError)
      return res.status(err.statusCode).json(err);
   return res.status(500).json({message:"Internal server error"});
 }
   
}
//function for otp verification
const verifyOTP = async (req,res) => {
   try{
     //get the otp from the user 
     const {email,otp} = req.body;

     //verify the user 
     const user = await User.findOne({email}).select("-password -refreshToken");
     if(!user){
         throw new ApiError(404,"Enter valid email");
     }

     if(user.otp !== otp.toString())
        throw new ApiError(401,"Incorrect otp");
     
     //delete the otp
     user.otp = undefined;
     await user.save({validateBeforeSave : false});

     return res.status(200).json(new ApiResponse(
         200,
         user,
         "otp verified successfully"
     ))
   }catch(err){
      console.log("Error while verifying otp :",err);
      if(err instanceof ApiError)
         return res.status(err.statusCode).json(err);
      return res.status(500).json({message:"Internal server error"});
   }

}
// function to update the avatar
const updateAvatar = async (req,res) => {
   try{
      // check for the files
      if(!req.file?.fieldname)
         throw new ApiError(400,"Avatar is required");

      //get the new avatar localpath
      const avatarLocalPath = req.file?.path;
      if(!avatarLocalPath){
         throw new ApiError(400,"Avatar is required");
      }
      // get the user
      const user = await User.findById(req.user._id);
      if(!user)
         throw new ApiError(404,"User not found");

      // if present push that on cloudinary
      const avatar = await uploadOnCloudinary(avatarLocalPath);

      // update the avatar and save 
      user.avatar = avatar.url;
      const updatedUser = await user.save(
         {validateBeforeSave : false},
         {new:true}
      )
      // remove the password and refresh token for saftey before sending response
      const safeUser = updatedUser.toObject();
      delete updatedUser["password"];
      delete updatedUser["refreshToken"];
      return res.status(200).json(
         new ApiResponse( 
            200,
            updatedUser,
            "Avatar updated successfully"
         )
      );

   }catch(err){
       console.log("Error while updating avatar :", err);
       if(err instanceof ApiError)
         return res.status(err.statusCode).json(err);
      return res.status(500).json({message:"Internal server error"});
   }
}

// function to update the avatar
const updateCoverImage = async (req,res) => {
   try{
      // check for the files
      if(!req.file?.fieldname)
         throw new ApiError(400,"CoverImage is required");

      //get the new avatar localpath
      const coverImageLocalPath = req.file?.path;
      if(!coverImageLocalPath){
         throw new ApiError(400,"Avatar is required");
      }
      // get the user
      const user = await User.findById(req.user._id);
      if(!user)
         throw new ApiError(404,"User not found");

      // if present push that on cloudinary
      const coverImage = await uploadOnCloudinary(coverImageLocalPath);

      // update the avatar and save 
      user.coverImage = coverImage.url;
      const updatedUser = await user.save(
         {validateBeforeSave : false},
         {new:true}
      )
      // remove the password and refresh token for saftey before sending response
      const safeUser = updatedUser.toObject();
      delete updatedUser["password"];
      delete updatedUser["refreshToken"];
      return res.status(200).json(
         new ApiResponse( 
            200,
            updatedUser,
            "coverImage updated successfully"
         )
      );

   }catch(err){
       console.log("Error while updating coverImage :", err);
       if(err instanceof ApiError)
         return res.status(err.statusCode).json(err);
      return res.status(500).json({message:"Internal server error"});
   }
}

// function to get user profile 
const getUserChannelProfile = async(req,res) =>{
   try{
     // get the username from the url 
     const {username} = req.params;
     if(!username){
        throw new ApiError(404,"username is missing")
     }
     
     //aggregation pipeline
     const channel = await User.aggregate([
          // stage 1 : Get the user channel
          {
            $match : {
               username
            }
          },
         // stage 2: get all subscribers
          {
            $lookup : {
                from : "subscriptions",
                localField : "_id",
                foreignField: "channel",
                as: "subscribers"
            }
          },
          //stage 3: subscribed to
         {
            $lookup:{
               from:"subscriptions",
               localField:"_id",
               foreignField:"subscriber",
               as:"subscribedTo"
            }
          },
         //  stage 3: add subscriberCount and channelSubscribedCount
          {
            $addFields:{
                subscribersCount : {
                   $size: "$subscribers" 
                },
                channelSubscribedCount:{
                  $size: "$subscribedTo" 
                },
                isSubscribed : {
                   $cond: {
                       if : {$in : [req.user?._id,"$subscribers.subscriber"]},
                       then : true,
                       else : false
                   }
                }
            }
          },
          // stage 4
          {
            $project : {
               fullName : 1,
               username : 1,
               subscribersCount : 1,
               channelSubscribedCount : 1,
               isSubscribed : 1,
               avatar : 1,
               coverImage : 1
            }
          }
     ]);

     //check for channel
     if(!channel[0]){
         throw new ApiError(404,"Channel does'nt Exist");
     }
     
     return res
            .status(200)
            .json(new ApiResponse(
               200,
               channel[0],
               "User channel fetched successfully"
            ));

   }catch(err){
       console.log("Error while getting user profile :",err);
       if(err instanceof ApiError)
          return res.status(err.statusCode).json(err);
       return res.status(500).json({
         message : "Internal Server error"
       })
   }

}

//function to get watch history 
const getWatchHistory = async(req,res) =>{
  const history = await History.aggregate([
      {
        $match: {
          user: req.user._id
        }
      },
      {
        $lookup: {
          from: 'videos',
          localField: 'video',
          foreignField: '_id',
          as: 'historyVideo'
        }
      },
      {
         $unwind: '$historyVideo'
      },
      {
        $sort: { updatedAt: -1 }
      },
      {
        $project: {
          user:0,
          video:0,
        }
      },
      
    ]);
    console.log(history);
   
   return res
         .status(200)
         .json(new ApiResponse(
            200,
            // user[0].watchHistory,
            history,
            "watch history sent sucessfully"
         ))
}

const updateUser = async(req,res) => {
   try{
      const {fullName,email} = req.body;
      if(!fullName || !email)
         throw new ApiError(400,'Missing fields');
      
      const userId = req?.user._id;
      if(!userId)
         throw new ApiError(401,'Unauthorized request');

      const user = await User.findByIdAndUpdate(userId,
         {
            fullName : fullName,
            email : email
         },
         {
            new:true
         }
      )
      if(!user)
         throw new ApiError(404,"User not found");

      return res.status(200)
                .json(new ApiResponse(
                  200,
                  user,
                  'Updated Successfully'
                ))

   }catch(err){
       console.log("Error while updating avatar :", err);
       if(err instanceof ApiError)
         return res.status(err.statusCode).json(err);
      return res.status(500).json({message:"Internal server error"});
   }
}

export {
   registerUser,
   loginUser,
   logoutUser,
   reGenerateAccessToken,
   changePassword,
   sendOtp,
   verifyOTP,
   updateAvatar,
   updateCoverImage,
   getUserChannelProfile,
   getWatchHistory,
   updateUser
};
