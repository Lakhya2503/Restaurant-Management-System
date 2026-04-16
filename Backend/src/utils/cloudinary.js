import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import ApiError from './ApiError.js';
import { cloudinaryApiKey, cloudinaryApiSecret, cloudinaryCloudName } from './config.js';


cloudinary.config({
  api_key: cloudinaryApiKey,
  api_secret: cloudinaryApiSecret,
  cloud_name: cloudinaryCloudName,
});



const uploadCloudinary = async function (localFilePath) {
    try {
        if (!localFilePath) {
            throw new ApiError(404, "localFile not found")
        }
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: 'auto'
        })
        return response
    } catch (error) {
        fs.unlinkSync(localFilePath)
        throw new ApiError(404, error.message || 'local file not found')
    }
}

export default uploadCloudinary;
