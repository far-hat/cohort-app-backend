import { body } from "express-validator";
import { handleValidationErrors } from "../middleware/validation";

export const validateUserRequest = [
   body("role").isString().notEmpty().withMessage('Role is required').isIn(["mentor" , "candidate"]).withMessage("Invalid role provided"),
   body("isActive").isBoolean().withMessage("Active status can only be true or false"),
   handleValidationErrors
]