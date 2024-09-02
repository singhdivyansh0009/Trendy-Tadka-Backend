import { ApiError } from "../utils/apiErrors.utils.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";

export const verifyJWT = async (req,res,next) => {
         try{
            // get the access token from the cookies
            const token = req.cookies?.accessToken;

            // check if token is present or not
            if(!token)
                throw new ApiError(401,'Unauthorized request');

            // verify the token
            const decoded = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET);
            
            // get the user from database 
            const user = await User.findById(decoded._id).select("-password -refreshToken");
            if(!user)
                throw new ApiError(401,"Invalid acess token");
            // if user present add that to the request object
            req.user = user
            next()  // move to the next method
            
         }catch(err){
            console.log("Error while verifying JWT :",err);
            // if its api error
            if (err instanceof ApiError) 
               return res.status(err.statusCode).json(err);
          
            // Handle other errors
            res.status(500).json({ message: "Internal Server Error" });
         }
}