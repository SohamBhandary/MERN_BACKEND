import asyncHandler from "../utils/asyncHandler.js"
import ApiError from "../utils/ApiError.js"
import {User } from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"


const registerUser=asyncHandler(async(req,res)=>{
    //get details of user from frontend
    //validation=non empty
    //check if user already exsists:check username and emial
    // check for imahes,check for avataar
    //upload them to cloudinary,avatar
    //create user object-create entry in db
    //remove password and refresh token field from response
    //check for creation
    //return response

   const {fullname,email,userName,password}= req.body
   console.log(email);
if([fullname,email,userName,password].some((field)=>{field?.trim()===""})){
  throw new ApiError(400,"All fields are required")

}
 const exisistedUSer=  User.findOne({ $or:[{ userName },{ email }]})
 if(exisistedUSer){
  throw new ApiError(409,"User with email or username alreay exsists")
 }
const avatarLocalPath= req.files?.avatar[0]?.path;
const converImageLocalPath=req.files?.coverImage[0]?.path;
if(!avatarLocalPath){
  throw new ApiError(400,"Avtar file is required");
}
const avatar=await uploadOnCloudinary(avatarLocalPath)
const coverImage= await uploadOnCloudinary(converImageLocalPath)
if(!avatar){
  throw new ApiError(400,"Avatar file is required")
}

const user=await User.create({fullname,
  avatar:avatar.url,
  coverImage:coverImage?.url||"",
  email,
  password,
  userName:toLowerCase()
})
const createdUser=await User.findById(user._id).select(
  "-password -refreshToken"
)
if(!createdUser){
  throw new ApiError(500,"Something went wrrong while registering the user")
}

return res.status(201).json(
  new ApiResponse(200,createdUser,"User registered succesfully")
)



})

export default registerUser;
