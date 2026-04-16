import User from '../models/user.models.js';
import ApiError from './ApiError.js';

export const requiredField = (fields = []) => {
    const isAnyFieldMissing = fields.some((field) => {
        if (field === undefined || field === null) return true;
        if (typeof field === "string" && field.trim() === "") return true;
        return false;
    });

    if (isAnyFieldMissing) {
        throw new ApiError(400, "All fields are required");
    }
}

export const removeRefreshTokenAndPassword = async(userId) => {
    await User.findById(userId).select("-password -refreshToken")
}
