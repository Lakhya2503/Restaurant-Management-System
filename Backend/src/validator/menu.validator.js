import { body } from "express-validator";

const menuValidator = () => {
  return [
    body("itemName")
      .trim()
      .notEmpty()
      .withMessage("Item name is required"),
    body("itemDescription")
      .trim()
      .notEmpty()
      .withMessage("Item description is required"),
    body("priceOfItem")
      .notEmpty()
      .withMessage("Price is required")
      .isNumeric()
      .withMessage("Price must be a number"),
    body("itemCategory")
      .trim()
      .notEmpty()
      .withMessage("Category is required"),
    body("isVeg")
      .optional()
      .toBoolean(),
  ];
};

export { menuValidator };
