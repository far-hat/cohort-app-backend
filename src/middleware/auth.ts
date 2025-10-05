import { Request,Response,NextFunction } from "express";
import { auth, JWTPayload } from "express-oauth2-jwt-bearer";
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
  const {authorization} = req.headers;

  if(!authorization || !authorization.startsWith("Bearer ")){
    return res.status(401).json({message:"Unauthorized"});
  }

  //the split will give us an array with Bearer as the first item and the access token as second and we capture the second item.
  const token = authorization.split(" ")[1];

  try {
    const decoded = jwt.decode(token!) as jwt.JwtPayload;
    const auth0Id = decoded.sub ?? " ";

    const user = await userRepository.findOneBy({auth0Id})

    if(!user){
      return res.sendStatus(401);
    }

    req.auth0Id = auth0Id;
    req.userId = user.user_id.toString();

    next();

  } catch (error) {
    return res.sendStatus(401);
  }


}