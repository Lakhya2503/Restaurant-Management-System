import { body } from "express-validator";

const homeDeliveryOrderValidator = () => {
  return [
    body("address")
      .trim()
      .notEmpty()
      .withMessage("Address is required"),
    body("items")
      .isArray({ min: 1 })
      .withMessage("Items must be a non-empty array"),
    body("items.*.itemId")
      .notEmpty()
      .withMessage("Item ID is required")
      .isMongoId()
      .withMessage("Invalid item ID"),
    body("items.*.quantity")
      .notEmpty()
      .withMessage("Quantity is required")
      .isInt({ min: 1 })
      .withMessage("Quantity must be at least 1"),
  ];
};

const tableOrderValidator = () => {
  return [
    body("tableNo")
      .notEmpty()
      .withMessage("Table number is required")
      .isNumeric()
      .withMessage("Table number must be a number"),
    body("items")
      .isArray({ min: 1 })
      .withMessage("Items must be a non-empty array"),
    body("items.*.itemId")
      .notEmpty()
      .withMessage("Item ID is required")
      .isMongoId()
      .withMessage("Invalid item ID"),
    body("items.*.quantity")
      .notEmpty()
      .withMessage("Quantity is required")
      .isInt({ min: 1 })
      .withMessage("Quantity must be at least 1"),
  ];
};

export { 
  homeDeliveryOrderValidator, 
  tableOrderValidator 
};
