import { Request,Response,NextFunction } from "express";
import jwt, { JwtHeader,SigningKeyCallback } from "jsonwebtoken";
import { User } from "../entities/User";
import AppDataSource from "../db/dataSource";
import JwksRsa from "jwks-rsa";


declare global {
  namespace Express {
    interface Request {
      userId : string;
      auth0Id : string;
    }
  }
}
const userRepository = AppDataSource.getRepository(User);

const jwksClient = JwksRsa({
  jwksUri : `${process.env.AUTH0_ISSUER_BASE_URL}.well-known/jwks.json`,
  cache : true,
  rateLimit : true,
  jwksRequestsPerMinute : 5,
});

function getKey(header : JwtHeader, callback : SigningKeyCallback){
  jwksClient.getSigningKey(header.kid!, (err,key) => {
    const signingKey = key?.getPublicKey();
    callback(err, signingKey);
  });
}

export const jwtParse = async(req : Request, res : Response, next : NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if(!authHeader?.startsWith("Bearer ")) return res.status(401).json({message : "Missing Auth Header"});

    const token = authHeader.split(" ")[1];

    if(!token) return res.status(401).json({message :"Token not found"});

    jwt.verify(
      token,
      getKey,
      {
        audience : process.env.AUTH0_AUDIENCE,
        issuer : process.env.AUTH0_ISSUER_BASE_URL,
        algorithms : ["RS256"],
      },

      async(err,decoded : any) => {
        if(err || !decoded.sub) return res.status(401).json({message : "Invalid Token"});

        const user = await userRepository.findOne({where: {auth0Id : decoded.sub}});

        if(!user) return res.status(401).json({message : "User not registered"});

        req.auth0Id = decoded.sub;
        req.userId = user.user_id.toString();

        next();

      }
    );
  } catch (error) {
    return res.status(401).json({message : "Unauthorised"});
  }
}




