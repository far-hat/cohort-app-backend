import { body, param } from "express-validator";
import { handleValidationErrors } from "../middleware/validation";

export const courseIdValidator = [
    param("course_id")
        .isInt()
        .withMessage("Course ID must be an integer"),
    handleValidationErrors
];

export const cohortCreationValidator = [
    body("cohort_name")
        .isString()
        .notEmpty()
        .trim()
        .withMessage("Cohort Name can't be empty"),

    body("start_date")
        .optional()
        .isISO8601()
        .withMessage("Start date must be in valid date format"),

    body("end_date")
        .optional()
        .isISO8601()
        .withMessage("End date must be in valid date format"),

    handleValidationErrors
];