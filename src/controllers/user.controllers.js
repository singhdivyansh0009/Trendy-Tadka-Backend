import { User } from "../models/user.models.js"
import {ApiError} from "../utils/apiErrors.utils.js"
import { ApiResponse } from "../utils/apiResponse.utils.js";
import { uploadOnCloudinary } from "../utils/cloudinary.utils.js";
import jwt from "jsonwebtoken";
import fs from "fs";

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
            
            // check for the files
            if(!req.files.avatar)
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
        console.log("Email ",email,"Pass",password,"user ",req.body);
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
           secure: true
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
          $set : {
            refreshToken : undefined
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

export {registerUser,loginUser,logoutUser,reGenerateAccessToken};