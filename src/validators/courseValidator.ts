import { body } from "express-validator";
import { handleValidationErrors } from "../middleware/validation";

export const courseCreationValidator = [

    body("course_title")
        .isString()
        .trim()
        .notEmpty()
        .withMessage("Course Title cannot be empty"),

    body("description")
        .isString()
        .trim()
        .notEmpty()
        .withMessage("Course Description cannot be empty"),

    handleValidationErrors
]