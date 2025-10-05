import { NextFunction,Response,Request } from "express";
import { body, validationResult } from "express-validator";

const handleValidationErrors = async (req:Request,res:Response,next:NextFunction) =>{
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json({errors : errors.array()} )
    }
    next();
}

export const validateUserRequest = [
   body("role").isString().notEmpty().withMessage('Role is required').isIn(["mentor" , "candidate"]).withMessage("Invalid role provided"),
   body("isActive").isBoolean().withMessage("Active status can only be true or false"),
   handleValidationErrors
]