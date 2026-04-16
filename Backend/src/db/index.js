import mongoose from 'mongoose';
import ApiError from '../utils/ApiError.js';
import { mongoDBURL } from '../utils/config.js';

const mongodbURL =  mongoDBURL || process.env.MONGODB_URI


const connectDB = async () => {
  try {
      const promise = await mongoose.connect(`${mongodbURL}`)
      return promise
  } catch (error) {
      throw new ApiError( 401,error.message)
      process.exit(1)
  }
}

export default connectDB;
