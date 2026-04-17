import User from '../models/user.models.js';
import { sendEmailVerifyUser } from '../services/email.service.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import uploadCloudinary from '../utils/cloudinary.js';
import { adminKey, verifyEmailURi } from '../utils/config.js';
import { removeRefreshTokenAndPassword, requiredField } from '../utils/helper.js';
import crypto from 'crypto'

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
          addresses : address
        })


           const { unHashedToken, hashedToken, tokenExpiry } =  user.generateTemporaryToken();

          user.emailVerificationToken = hashedToken;
          user.emailVerificationExpiry = tokenExpiry;

          await user.save({ validateBeforeSave: false });

          await user.save({ validateBeforeSave : false })

          console.log(`${verifyEmailURi}/verify-email?token=${unHashedToken}`);

        //  await sendEmailVerifyUser(user.email, user.fullName, unHashedToken)


      await removeRefreshTokenAndPassword(user._id)


    return res.status(200).json(new ApiResponse(201, {}, `${`user.role`} created Successfully`))
})

const loginUser = asyncHandler(async(req,res)=>{

  const { email, password } = req.body

  requiredField([email,password])

    const user = await User.findOne({email})


    if(!user.isEmailVerified){
      throw new ApiError(401, "User can't login beacuse user didn't verify")
    }

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

  console.log(req.body)

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

const verifyEmail = asyncHandler(async (req, res) => {
  const verificationToken = req.query.token;

  if (!verificationToken) {
    throw new ApiError(400, "Email verification token missing");
  }

  const hashedToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpiry: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, "Invalid or expired verification token");
  }


  user.isEmailVerified = true;


  user.emailVerificationToken = undefined;
  user.emailVerificationExpiry = undefined;

  await user.save({ validateBeforeSave: false });

  return res.status(200).json(
    new ApiResponse(200, {}, "Email verified successfully")
  );
});
const allUsers = asyncHandler(async(req,res)=>{

    const users = await User.find().populate()

    console.log(users)

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

const  newUserAddress = asyncHandler(async(req,res)=>{

    const { addressLine, place, pinCode, label } = req.body

    if (!addressLine || !place || !pinCode) {
      throw new ApiError(400, "All address fields are required");
    }

    let addData = {
        addressLine,
        place,
        pinCode,
        label: label || "Home",
        isDefault: false
    }

    console.log("Adding address:", addData)

    const user = await User.findById(req.user._id);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // If this is the first address, make it default
    if (!user.addresses || user.addresses.length === 0) {
      addData.isDefault = true;
    }

    const addUserAddress = await User.findByIdAndUpdate(
        req.user._id,
        { $push: { addresses: addData } },
        { new: true }
      ).select("-password -refreshToken");


      if(!addUserAddress) {
        throw new ApiError(400, "User address can't add")
      }

  return res.status(200).json(new ApiResponse(200, addUserAddress, "User address add successfully"))
})

const updateUserAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;
  const { addressLine, place, pinCode, label, isDefault } = req.body;

  if (!addressLine || !place || !pinCode) {
    throw new ApiError(400, "All address fields are required");
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // If setting as default, unset all other defaults
  if (isDefault) {
    user.addresses.forEach(addr => {
      addr.isDefault = false;
    });
  }

  // Find and update the specific address
  const addressIndex = user.addresses.findIndex(
    addr => addr._id.toString() === addressId
  );

  if (addressIndex === -1) {
    throw new ApiError(404, "Address not found");
  }

  user.addresses[addressIndex] = {
    ...user.addresses[addressIndex].toObject(),
    addressLine,
    place,
    pinCode,
    label: label || user.addresses[addressIndex].label,
    isDefault: isDefault || user.addresses[addressIndex].isDefault
  };

  await user.save();

  const updatedUser = await User.findById(user._id).select("-password -refreshToken");

  return res.status(200).json(
    new ApiResponse(200, updatedUser, "Address updated successfully")
  );
});

const setDefaultAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  user.addresses.forEach(addr => {
    addr.isDefault = addr._id.toString() === addressId;
  });

  await user.save();

  const updatedUser = await User.findById(user._id).select("-password -refreshToken");

  return res.status(200).json(
    new ApiResponse(200, updatedUser, "Default address updated")
  );
});

const deleteAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $pull: {
        addresses: { _id: addressId }
      }
    },
    { new: true }
  ).select("-password -refreshToken");

  return res.status(200).json(
    new ApiResponse(200, user, "Address deleted successfully")
  );
});


export {
  allUsers, changeCurrentPassword, currentUser, deleteAddress, googleLoginCallback, loginUser,
  logoutUser, newUserAddress, registerUser, setDefaultAddress, updateAccountDetails, updateUserAddress, updateUserAvatar, verifyEmail,
  verifyEmailRequest
};
