import { Router } from 'express'
import {
  allUsers,
  currentUser,
  loginUser,
  logoutUser,
  registerUser,
  verifyEmail,
  googleLoginCallback,
  updateAccountDetails,
  updateUserAvatar
} from "../controller/user.controller.js"
import { verifyAdmin, verifyJWT } from "../middleware/auth.middelware.js"
import passport from "../passport/index.js"
import { uploadAvatar } from '../middleware/multer.middleware.js'
import { googleCallbackUrL } from '../utils/config.js'
// import { userLoginValidator, userRegisterValidator } from '../validator/auth.validator.js'
// import { validate } from '../validator/validate.js'

const router = Router()

router.route("/user/register").post(
  uploadAvatar.fields(
  [
    {
      name : "avatar",
      maxCount: 1
    }
  ]
),
  registerUser
);

router.route("/user/login").post(loginUser)

router.route("/user/logout").post(verifyJWT, logoutUser)

router.route("/user/email-verify").post(verifyJWT, verifyEmail)

router.route("/user/all-users").get(verifyAdmin, allUsers)

router.route("/user/me").get(verifyJWT, currentUser)
router.route("/user/update-profile").post(verifyJWT, updateAccountDetails)
router.route("/user/update-avatar").post(verifyJWT, uploadAvatar.single('avatar'), updateUserAvatar)


router.get(
  "/callback/google",
  passport.authenticate("google", {
    failureRedirect: "/login",
    session: true,
  }),
  googleLoginCallback
);



export default router;
