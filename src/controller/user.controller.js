import asyncHandler from "../utils/asyncHandler.js"
import ApiError from "../utils/ApiError.js"
import {User } from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const generateAccesAndRefreshTokens=async(userId)=>{
  try {
   const user= await User.findById(userId)
  const accesToken= user.generateAccesToken()
  const  refreshToken=user.refreshAccesToken()
  user.refreshAccesToken=refreshToken
 await user.save({validateBeforeSave:false})
 return {accesToken,refreshToken}
    
  } catch (error) {
    throw new ApiError(500,"Something went wrong while generating refreshand acces token")
    
  }
}

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
 const exisistedUSer= await User.findOne({ $or:[{ userName },{ email }]})
 if(exisistedUSer){
  throw new ApiError(409,"User with email or username alreay exsists")
 }
const avatarLocalPath= req.files?.avatar[0]?.path;
// const converImageLocalPath=req.files?.coverImage[0]?.path;
let converImageLocalPath;
if(req.files && Array.isArray(req.files.coverImage)&& req.files.coverImage>0){
  converImageLocalPath=req.files.coverImage[0].path

}
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
  userName:userName.toLowerCase()
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

const loginUser=asyncHandler(async(req,res)=>{
  //req body->data
  //userName or email
  //find the user
  //check password
  //access and refresh token
  //send cookie
  const{email,userName,password}=req.body

  if (!username|| !email) {
    throw new ApiError(400,"Username or email is required");
    
    
  }
 const user=await User.findOne({
    $or:[{userName},{email}]
  })
  if(!user){
    throw new ApiError(404,"User does not exisst")
  }

  const isPasswordValid=await user.isPasswordCorrect(password)
  
   if(!isPasswordValid){
    throw new ApiError(401,"Invalid user credentials")
  }
 const {accesToken,refreshToken}=await generateAccesAndRefreshTokens(user._id)
const loggedInUser= User.findById(user._id).select("-password -refreshToken")

const options={
  httpOnly:true,
  secure:true
}
return res.status(200).cookie("accessToken",accesToken,options).cookie("refreshToken",refreshToken)
.json(new ApiError(200,{
  user:loggedInUser,accesToken,refreshToken
},"User logged in Succesfully"))


const logoutUser=asyncHandler(asyncHandler(async(req,res)=>{
User.findByIdAndUpdate(
  req.user._id,{
    $set:{
      refreshToken:undefined
    }
  },{
    new:true
  }
)
const options={
  httpOnly:true,
  secure:true
}
return res.status(200).clearCookie("accesToken",options).clearCookie("refreshToken",options).json(new ApiResponse(200,{},"User logged out"))
}))

})


export{registerUser,loginUser,logoutUser}
