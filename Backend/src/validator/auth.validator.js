// import { body } from "express-validator";

// const userRegisterValidator = () => {
//   return [
//     body("email")
//       .trim()
//       .notEmpty()
//       .withMessage("Email is required")
//       .isEmail()
//       .withMessage("Email is invalid"),
//     body("fullName")
//       .trim()
//       .notEmpty()
//       .withMessage("Full name is required")
//       .isLength({ min: 3 })
//       .withMessage("Full name must be at least 3 characters long"),
//     body("password").trim().notEmpty().withMessage("Password is required"),
//     body("phoneNumber")
//       .notEmpty()
//       .withMessage("Phone number is required")
//       .isNumeric()
//       .withMessage("Phone number must be a number")
//       .isLength({ min: 10, max: 10 })
//       .withMessage("Phone number must be 10 digits"),
//   ];
// };

// const userLoginValidator = () => {
//   return [
//     body("email")
//       .trim()
//       .notEmpty()
//       .withMessage("Email is required")
//       .isEmail()
//       .withMessage("Email is invalid"),
//     body("password").trim().notEmpty().withMessage("Password is required"),
//   ];
// };

// export {
//   userRegisterValidator,
//   userLoginValidator
// };
