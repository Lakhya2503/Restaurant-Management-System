import User from '../models/user.models.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import uploadCloudinary from '../utils/cloudinary.js';
import { adminKey } from '../utils/config.js';
import { removeRefreshTokenAndPassword, requiredField } from '../utils/helper.js';

const option = {
  httpOnly : true,
  secure : process.env.NODE_ENV === 'production',
  sameSite: 'Lax'
}

export const generateAccessRefreshToken = async(userId) => {

      const user = await User.findById(userId)

    const accessToken =  await  user.generateAccessToken()
    const refreshToken = await  user.generateRefreshToken()

     user.refreshToken = refreshToken

    await user.save({ validateBeforeSave : false })

    return {
      refreshToken ,
      accessToken
    }

}

const registerUser = asyncHandler(async(req,res)=>{

    const { fullName, email, password, adminSuperKey, phoneNumber, address } = req.body

    requiredField([fullName,email,password,phoneNumber])


    const avatar = req.files?.avatar?.[0]?.path

    let avatarURI;

    if(avatar) {
       avatarURI =  await uploadCloudinary(avatar)
    }

    let role;
    if(adminSuperKey !== adminKey) {
        role = "user"
    } else {
        role = "admin"
    }

    const alreadyExist = await User.findOne({email})

    if(alreadyExist) {
      throw new ApiError(400 ,`${alreadyExist.role} already exist`)
    }


    const user = await User.create({
          fullName,
          password,
          email,
          avatar : avatarURI ? avatarURI.url : avatarURI,
          phoneNumber,
          role : role,
          address : address
        })

      await removeRefreshTokenAndPassword(user._id)

    return res.status(200).json(new ApiResponse(201, {}, `${`user.role`} created Successfully`))
})

const loginUser = asyncHandler(async(req,res)=>{

  const { email, password } = req.body

  requiredField([email,password])

    const user = await User.findOne({email})

    if(!user) {
      throw new ApiError(401, "User can't exist with this email")
    }

  const passwordValid = await user.isPasswordCorrect(password)

  if(!passwordValid) {
    throw new ApiError(403, "Please check Credientials")
  }

  const { refreshToken, accessToken } = await generateAccessRefreshToken(user._id)

  await User.findById(user._id).select("-password -refreshToken")

  return res
  .status(200)
  .cookie("accessToken" , accessToken, option)
  .cookie("refreshToken" , refreshToken, option)
  .json(new ApiResponse(200, user , `${user.role} logged in successfully`))
})

const logoutUser = asyncHandler(async(req,res)=>{
   const user = req.user

    await User.findByIdAndUpdate(user._id,
    {
          $set : {
            refreshToken : ""
          }
    }, { new: true })



   return res
      .status(200)
      .cookie("accessToken" , "", option)
      .cookie("refreshToken", "", option)
      .json(new ApiResponse(200, {}, "user logged out successfully"))
})

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, phoneNumber } = req.body;

  if (!fullName && !phoneNumber) {
    throw new ApiError(400, "FullName or PhoneNumber is required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        ...(fullName && { fullName }),
        ...(phoneNumber && { phoneNumber })
      }
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  const avatar = await uploadCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url
      }
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

const changeCurrentPassword = asyncHandler(async(req,res)=>{

    const { oldPassword, newPassword } = req.body

    requiredField([oldPassword, newPassword])

    const user = await User.findById(req.user._id)

    const isValidaPassword =  await  user.isPasswordCorrect(oldPassword)

    if(!isValidaPassword) {
      throw new ApiError(404, "Credentials failed")
    }

    user.password = newPassword

    user.save({ validateBeforeSave : false })

   await removeRefreshTokenAndPassword(user._id)

  return res
    .status(204)
    .json(new ApiResponse(204,{}, `${user.role} password changed successfully`))
})

const verifyEmailRequest = asyncHandler(async(req,res)=>{

    const user = await User.findById(req.user._id)

    if(!user) {
       throw new ApiError(404, "user not found")
    }

    const { unHashedToken, hashedToken, tokenExpiry } =  user.generateTemporaryToken(user._id)

    user.emailVerificationExpiry = hashedToken
    user.emailVerificationToken = tokenExpiry

  await user.save({ validateBeforeSave : false })



  return  res
    .status(204)
    .json(new ApiResponse(204, { "token" : unHashedToken } , `${user.role} verify emailId`))
})

const verifyEmail = asyncHandler(async(req,res)=>{

    const { verificationToken  } = req.body


    if(!verificationToken){
      throw new ApiError(404,"Email verification Token Missing")
    }

  let hashedToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex")


    const user = await User.findOne({
      emailVerificationToken : hashedToken,
      emailVerificationExpiry : {$gt : Date.now()}
    })

      return res
          .status(204)
          .json(new ApiResponse(204 , {} , " Email Verified successfully "))
})

const allUsers = asyncHandler(async(req,res)=>{

    const users = await User.find().populate()

  return res.status(200).json(new ApiResponse(200, { users } , "all Users fetch successfully"))
})

const currentUser = asyncHandler(async(req,res)=>{

    const user = await User.findById(req.user?._id).populate()

   await removeRefreshTokenAndPassword(user._id)

  return res.status(200).json(new ApiResponse(200,   user, "user fetch Successfully"))
})


const googleLoginCallback = asyncHandler(async (req, res) => {
  const user = req.user;

  if (!user) {
    throw new ApiError(401, "Google authentication failed");
  }

  const { refreshToken, accessToken } = await generateAccessRefreshToken(user._id);

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  const redirectUrl = user.role === "admin" ? "/admin" : "/profile";

  return res
    .status(200)
    .cookie("accessToken", accessToken, option)
    .cookie("refreshToken", refreshToken, option)
    .redirect(`${process.env.CLIENT_URL || "http://localhost:8080"}${redirectUrl}`);
});

export {
    changeCurrentPassword,
    loginUser,
    logoutUser,
    registerUser,
    verifyEmail,
    verifyEmailRequest,
    allUsers,
    googleLoginCallback,
    currentUser,
    updateAccountDetails,
    updateUserAvatar
};
