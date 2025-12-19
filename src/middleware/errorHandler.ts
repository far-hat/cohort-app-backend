import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";

export const errorHandler = (
    err : any,
    req : Request,
    res : Response,
    next : NextFunction
) => {
    //default values

    let statusCode = 500;
    let message = "Internal Server Error";

    // Operational error which is known
    if(err instanceof AppError){
        statusCode = err.statusCode;
        message = err.message;
    }

    if(err.name == "Query failed"){
        statusCode = 400;
        message = "database query failed";
    }

    console.error("ERROR",err);

    res.status(statusCode).json({
        success : false,
        message
    });
}