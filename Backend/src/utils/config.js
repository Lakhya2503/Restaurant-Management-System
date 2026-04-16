import { configDotenv } from "dotenv"
configDotenv({
  path : "./.env"
})

export const port = process.env.PORT
export const corsOrigin = String(process.env.CORS_ORIGIN)
export const defaultRouter = String(process.env.DEAFULT_ROUTE)
export const adminKey = String(process.env.ADMIN_SUPER_KEY)
export const mongoDBURL = String(process.env.MONGODB_URI)
export const accessTokenSecret = String(process.env.ACCESS_TOKEN_SECRET)
export const refreshTokenSecret = String(process.env.REFRESH_TOKEN_SECRET)
export const accessTokenExpiry = String(process.env.ACCESS_TOKEN_EXPIRY)
export const refreshTokenExpiry = String(process.env.REFRESH_TOKEN_EXPIRY)
export const cloudinaryCloudName = String(process.env.CLOUDINARY_CLOUD_NAME)
export const cloudinaryApiKey = String(process.env.CLOUDINARY_API_KEY)
export const cloudinaryApiSecret = String(process.env.CLOUDINARY_API_SECRET)
export const rozarPayKeyId = String(process.env.RAZORPAY_KEY_ID)
export const rozarPayKeySecret = String(process.env.RAZORPAY_KEY_SECRET)
export const googleCallbackUrL = String(process.env.GOOGLE_CALLBACK_URL)
export const googleClientId =  String(process.env.GOOGLE_CLIENT_ID)
export const googleClientSecret = String(process.env.GOOGLE_CLIENT_SECRET)
export const brevoApiKey = String(process.env.BREVO_API_KEY)
export const brevoSenderName = String(process.env.BREVO_SENDER_NAME)
export const brevoSenderEmail = String(process.env.BREVO_SENDER_EMAIL)



