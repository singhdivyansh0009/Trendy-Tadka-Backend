import { v2 as cloudinary } from 'cloudinary';
import fs from "fs";

const uploadOnCloudinary = async (localFilePath) => {
       try{
          // configure the cloudinary
          await cloudinary.config({ 
               cloud_name: process.env.CLOUDINARY_NAME, 
               api_key: process.env.CLOUDINARY_API_KEY, 
               api_secret: process.env.CLOUDINARY_API_SECRET
            });

          if(!localFilePath) return null;
          const uploadResponse = await cloudinary.uploader.upload(localFilePath, {
               resource_type : "auto"
          })

          console.log("File is uploaded on cloudinary",uploadResponse.url);
          fs.unlinkSync(localFilePath); // remove the file from server 
          return uploadResponse;

       }catch(err){
           fs.unlinkSync(localFilePath);
           console.log("Error while uploading file on cloudinary",err);
       }
}

export {uploadOnCloudinary};