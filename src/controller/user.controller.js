import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

// 🔐 Generate Access and Refresh Tokens
const generateAccesAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accesToken = user.generateAccesToken();
    const refreshToken = user.refreshAccesToken();
    user.refreshAccesToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accesToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating tokens");
  }
};

// 📝 Register User
const registerUser = asyncHandler(async (req, res) => {
  const { fullname, email, userName, password } = req.body;

  if ([fullname, email, userName, password].some((field) => !field || field.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ userName }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  const avatarLocalPath = req?.files?.avatar?.[0]?.path;
  let coverImageLocalPath;

  if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar upload failed");
  }

  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    userName: userName.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select("-password -refreshToken");

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

// 🔑 Login User
const loginUser = asyncHandler(async (req, res) => {
  const {email, userName, password } = req.body;

  if (!userName && !email) {
    throw new ApiError(400, "Username or email is required");
  }

  const user = await User.findOne({
    $or: [{ userName }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accesToken, refreshToken } = await generateAccesAndRefreshTokens(user._id);
  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accesToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accesToken, refreshToken },
        "User logged in successfully"
      )
    );
});

// 🚪 Logout User
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    { $set: { refreshToken: undefined } },
    { new: true }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken=asyncHandler(async(req,res)=>{
const incomingRefreshToken= req.cookie.refreshToken || req.body.refreshToken
if(!incomingRefreshToken){
  throw new ApiError(401,"Unauthorized request")
}
try {
  const decodedToken=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
  const user=await User.findById(decodedToken?._id);
  if(!user){
    throw new ApiError(401,"Invalid refresh Token")
  }
  
  if(incomingRefreshToken!=user?.refreshToken){
    throw new ApiError(401,"Refresh token is expired or used")
  }
  
  const options= {
    httpOnly:true,
    secure:true
  }
  const{accesToken,newrefreshToken}= await generateAccesAndRefreshTokens(user._id)
  return res.status(200).cookie("accessToken",accesToken,options).cookie("refreshToken",newrefreshToken,options).json( new ApiResponse(200,{accesToken,refreshToken:newrefreshToken},"Acces tokenr efresh succesfully"))
} catch (error) {
  throw new ApiError(401,error?.message || "Invalid Refresh tokne")
  
}



})
const  changeCurrentPassword=asyncHandler(async(req,res)=>{

  const {oldPassword,newPassword}=req.body

  
  const user= await User.findById(req.user?._id )
 const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)
 if(!isPasswordCorrect){
  throw new ApiError(400,"Invalid old password")
 }
 user.password=newPassword
 await user.save({validateBeforeSave:false})

 return res.status(200).json(new ApiResponse(200,{},"Paasowrd change succesfully"))


})

const getCurrentUser=asyncHandler(async(req,res)=>{
  return res.status(200).json(200,req.user,"Current User fetched succesfully")
})

const updateAccountDetails=asyncHandler(async(req,res)=>{
  const {fullname,email}=req.body
  if(!email ||!email){
    throw new ApiError(400,"All felds are required")
  }
  
  const user=User.findOneAndUpdate(req.user?._id,{$set:{
    fullname,
    email
  
  }},{new:true}).select("-password")
  return res.status(200).json(new ApiResponse(200,user,"Updated succefully"))

})
const updateUserAvatar= asyncHandler(async(req,res)=>{

 const avatarLocalPath= req.file?.path
 if(!avatarLocalPath){
  throw new ApiError(400,"AvtarFile is missing")
 }
 const avatar=await uploadOnCloudinary(avatarLocalPath)
 if(!avatar.url){
   throw new ApiError(400,"Error while uploading")
 }

  const user= await User.findByIdAndUpdate(req.user?._id,{$set:{avatar:avatar.url}},{new:true}).select("-password")
   return res.status(200).json(new ApiResponse(200,user,"AvtarImage updated"))

})
const updateUserCoverImage= asyncHandler(async(req,res)=>{

 const coverImageLocalPath= req.file?.path
 if(!coverImageLocalPath){
  throw new ApiError(400,"CoverFile is missing")
 }
 const coverImage=await uploadOnCloudinary(coverImageLocalPath)
 if(!coverImage.url){
   throw new ApiError(400,"Error while uploading")
 }

  const user= await User.findByIdAndUpdate(req.user?._id,{$set:{coverImage:coverImage.url}},{new:true}).select("-password")
  return res.status(200).json(new ApiResponse(200,user,"CoverImage updated"))

})
const getUserChannelProfile=asyncHandler(async(req,res)=>{

 const {username}= req.params
 if(!username?.trim()){
  throw new ApiError(400,"username is missing")
 }
 const channel=await User.aggregate([{$match:{username:username?.toLowerCase()}},{
  $lookup:{
    from:"subcriptions",
    localField:_id,
    foreignField:"channel",
    as:"subcriber"
  }
 },{
  $lookup:{
    from:"subcriptions",
    localField:_id,
    foreignField:"subcriber",
    as:"subcribedTo"
  }

 },
{
  $addFields:{
    subcriberCount:{
      $size:"$subcribers"
    },
    channelsSubcribedToCount:{
      $size:"$subcribedTo"
    },
    isSubcribed:{
      $cond:{if:{$in:[req.user?._id,"$subcribers.subcriber"]

      },then:true,
    else:true}
    }


  },
  $project:{
    fullname:1,
    username:1,
    subcriberCount:1,
    channelsSubcribedToCount:1,
    isSubcribed:1,
    avatar:1,
    coverImage:1,
    email:1
  }
}])
if(!channel?.length){
  throw new ApiError(404,"channel does not exsists")
}
})


// 📦 Export
export { registerUser, loginUser, logoutUser ,refreshAccessToken,changeCurrentPassword,getCurrentUser,updateAccountDetails,updateUserAvatar,updateUserCoverImage,getUserChannelProfile};
