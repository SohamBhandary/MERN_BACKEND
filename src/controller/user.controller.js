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
// 📦 Export
export { registerUser, loginUser, logoutUser ,refreshAccessToken};
