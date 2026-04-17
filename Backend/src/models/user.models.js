import bcrypt from 'bcrypt'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import mongoose, { Schema } from 'mongoose'
import { accessTokenExpiry, accessTokenSecret, refreshTokenExpiry, refreshTokenSecret } from '../utils/config.js'
import { AvailbleSocialLogins, AvailbleUserRole, USER_TEMPORARY_TOKEN, userLoginType, userRoleEnums } from '../utils/constants.js'

const userSchema = new  Schema(
  {
        fullName :  {
          type : String,
          required : true,
          trim: true
        },
      email : {
        type : String,
        required: true,
        lowercase : true,
         match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email format is incorrect. Use a valid format such as name@example.com (e.g., jane.smith@gmail.com) .']
      },
        password : {
            type : String,
            required : true
        },
        role : {
          type : String,
          required : true,
          default : userRoleEnums.USER,
          enum : AvailbleUserRole
        },
        phoneNumber : {
          type : Number
        },
        avatar : {
          type : String , //cloudinary uri
          def : ""
        },
        loginType : {
          type : String,
          enum : AvailbleSocialLogins,
          default : userLoginType.EMAIL_PASSWORD
        },
        isEmailVerified : {
            type : Boolean,
            default : false
        },
        forgotPasswordToken : {
          type : String
        },
        forgotPasswordExpiry : {
          type : Date
        },
        emailVerificationToken : {
          type : String
        },
        emailVerificationExpiry : {
          type : Date
        },
        addresses: [
            {
              addressLine: {
                type: String,
                required: true
              },
              place: {
                type: String,
                required: true
              },
              pinCode: {
                type: Number,
                required: true
              },
              label: {
                type: String,
                default: "Home"
              },
              isDefault: {
                type: Boolean,
                default: false
              }
            }
        ],
        refreshToken : {
          type: String,
          default : ""
        }
  } , { timestamps : true })

userSchema.pre("save", async function() {
    if(!this.isModified("password")) return ;
    this.password = await bcrypt.hash(this.password, 10)
})

userSchema.methods.isPasswordCorrect =async function(password){
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function() {
   return jwt.sign({
      _id : this._id,
      fullName : this.fullName,
      email : this.email,
    }, accessTokenSecret, {
    expiresIn : accessTokenExpiry
   })
}

userSchema.methods.generateRefreshToken = function() {
   return jwt.sign({
      _id : this._id
    }, refreshTokenSecret, {
    expiresIn :  refreshTokenExpiry
   })
}

userSchema.methods.generateTemporaryToken = function () {
  const unHashedToken = crypto.randomBytes(20).toString("hex");

  const hashedToken = crypto
    .createHash("sha256")
    .update(unHashedToken)
    .digest("hex");

  const tokenExpiry = Date.now() + 10 * 60 * 1000; 

  return {
    unHashedToken,
    hashedToken,
    tokenExpiry,
  };
};

const User = mongoose.model("User",userSchema)
export default User;
