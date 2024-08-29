import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema(
    {
        username : {
             type : String,
             required : true,
             unique : true,
             trim : true
        },
        email : {
            type : String,
            required : true,
            unique : true
        },
        fullName : {
            type : String,
            required : true
        },
        password : {
            type : String,
            required : true,
            unique : true,
        },
        refreshToken : {
            type : String
        },
        avatar : {
            type : String,
        },
        coverImage : {
            type : String
        },
        watchHistory : [
            {
                type : Schema.Types.ObjectId,
                ref : "Videos"
            }
        ]
    },{  timestamps: true }
);

// This hook is called before saving data in database
userSchema.pre("save",async function(next){
    if(!this.isModified("password"))  return next();
    this.password = await bcrypt.hash(this.password, 10);
})

// Method to check for the correct password
userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password,this.password);
}

// Method to genrate acess token
userSchema.methods.genrateAcessToken = function (params) {
    jwt.sign(
        {
            _id : this._id,
            username : this.username,
            email : this.email
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn : process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

// Method to genrate refresh token
userSchema.methods.genrateRefreshToken = function (params) {
    jwt.sign(
        {
            _id : this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn : process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}
export const User = mongoose.model("User",userSchema);