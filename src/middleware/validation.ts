import { NextFunction, Request, Response } from "express";
import {
  validationResult,
  FieldValidationError,
} from "express-validator";

export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map((err) => {
        if (err.type === "field") {
          const fieldError = err as FieldValidationError;

          return {
            field: fieldError.path, 
            message: fieldError.msg,
          };
        }

        
        return {
          field: "unknown",
          message: err.msg,
        };
      }),
    });
  }

  next();
};
