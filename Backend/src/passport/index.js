import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

import User from "../models/user.models.js";
import ApiError from "../utils/ApiError.js";
import {
  googleCallbackUrL,
  googleClientId,
  googleClientSecret,
} from "../utils/config.js";

import {
  AvailbleUserRole,
  userLoginType,
} from "../utils/constants.js";

/**
 * Serialize user into session
 */
passport.serializeUser((user, done) => {
  done(null, user._id);
});

/**
 * Deserialize user from session
 */
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: googleClientId,
      clientSecret: googleClientSecret,
      callbackURL: googleCallbackUrL,
      scope: ["profile", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;

        if (!email) {
          return done(new ApiError(400, "Google account has no email"), null);
        }

        // Check if user already exists
        let user = await User.findOne({ email });

        if (user) {
          if (user.loginType !== userLoginType.GOOGLE) {
            return done(
              new ApiError(
                400,
                `Please login using ${user.loginType.toLowerCase().replace("_", " ")}`
              ),
              null
            );
          }

          return done(null, user);
        }

        // Create new user
        const newUser = await User.create({
          email,
          fullName: profile.displayName || email.split("@")[0],
          password : profile.id,
          isEmailVerified: true,
          role: AvailbleUserRole.USER,
          avatar: profile.photos?.[0]?.value,
          loginType: userLoginType.GOOGLE,
        });

        return done(null, newUser);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

export default passport;
