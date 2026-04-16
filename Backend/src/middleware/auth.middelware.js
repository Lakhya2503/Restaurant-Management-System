import User from "../models/user.models.js"
import ApiError from "../utils/ApiError.js"
import jwt from "jsonwebtoken"
import { accessTokenSecret } from "../utils/config.js"
import asyncHandler from "../utils/asyncHandler.js"

export const verifyJWT = asyncHandler(async (req, res, next) => {
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "")


  if (!token) {
    throw new ApiError(401, "Unauthorized request")
  }

  const decodedToken = jwt.verify(token, accessTokenSecret)

  const user = await User.findById(decodedToken._id).select(
    "-password -refreshToken"
  )


  if (!user) {
    throw new ApiError(401, "Invalid access token")
  }

  req.user = user
  next()
})

export const verifyAdmin = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    // If verifyJWT wasn't called before this, we must do it now
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(token, accessTokenSecret);
    const user = await User.findById(decodedToken._id).select("-password -refreshToken");

    if (!user) {
      throw new ApiError(401, "Invalid access token");
    }
    req.user = user;
  }

  if (req.user.role !== "admin") {
    throw new ApiError(403, "Only admin can perform this action");
  }

  next();
});
