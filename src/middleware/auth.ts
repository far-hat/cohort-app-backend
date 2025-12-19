import { Request,Response,NextFunction } from "express";
import { auth } from "express-oauth2-jwt-bearer";
import jwt from "jsonwebtoken";

import { User } from "../entities/User";
import AppDataSource from "../db/dataSource";


declare global {
  namespace Express {
    interface Request {
      userId : string;
      auth0Id : string;
    }
  }
}
const userRepository = AppDataSource.getRepository(User);


export const jwtCheck = auth({
  audience: process.env.AUTHO_AUDIENCE !,
  //non null assertion
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL  ?? "", //nullish coalescing
  tokenSigningAlg: 'RS256'
});

export const jwtParse = async (req:Request,res:Response,next:NextFunction)=>{
  try {
    const authHeader = req.headers.authorization;

    if(!authHeader || !authHeader.startsWith("Bearer ")){
      return res.sendStatus(401);
    }

    const token = authHeader.split(" ")[1];
    if(!token) return;
    const decoded = jwt.decode(token) as jwt.JwtPayload;

    if(!decoded?.sub){
      return res.sendStatus(401);
    }

    const user = await userRepository.findOneBy({
      auth0Id : decoded.sub,
    });

    if(!user){
      return res.sendStatus(401);
    }

    req.auth0Id = decoded.sub;
    req.userId = user.user_id.toString();

  } catch (error) {
    return res.sendStatus(401);
  }

  //the split will give us an array with Bearer as the first item and the access token as second and we capture the second item.
  


}