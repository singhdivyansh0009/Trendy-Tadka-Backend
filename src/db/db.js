import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

// function to connect the database
const connectDB = async () => {
       try{
           const connection = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
           console.log("Database Connected !! HOST:", connection.connections[0].host);
       }catch(err){
          console.log("DB connection failed : ", err);
       }
}

export default connectDB;