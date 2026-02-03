import { Request, Response, NextFunction } from "express";
import jwt, { JwtHeader, SigningKeyCallback } from "jsonwebtoken";
import { User } from "../entities/User";
import AppDataSource from "../db/dataSource";
import JwksRsa from "jwks-rsa";
import { Quiz } from "../entities/Quiz";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        auth0Id: string,
        userId: string,
        user: User
      };
      quiz?: Quiz
    }

  }
}

const userRepository = AppDataSource.getRepository(User);

const jwksClient = JwksRsa({
  jwksUri: `${process.env.AUTH0_ISSUER_BASE_URL}.well-known/jwks.json`,
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 5,
});

function getKey(header: JwtHeader, callback: SigningKeyCallback) {
  jwksClient.getSigningKey(header.kid!, (err, key) => {
    const signingKey = key?.getPublicKey();
    callback(err, signingKey);
  });
}

export function verifyToken(token: string): Promise<{ sub: string }> {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        audience: process.env.AUTH0_AUDIENCE,
        issuer: process.env.AUTH0_ISSUER_BASE_URL,
        algorithms: ["RS256"],
      },
      (err, decoded: any) => {
        if (err || !decoded?.sub) return reject("Invalid token");
        resolve({ sub: decoded.sub });
      }
    );
  });
}

export const jwtParse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ message: "Missing Auth Header" });

    const token = authHeader.split(" ")[1];

    if (!token) return res.status(401).json({ message: "Token not found" });

    const { sub } = await verifyToken(token);

    if (!sub) return res.status(401).json({ message: " Sub not found for auth" })
    const user = await userRepository.findOne({ where: { auth0Id: sub } });

    if(!user) return res.status(404).json({message : "User not registered yet"});
    
    req.auth = {
      auth0Id: sub,
      userId: user?.user_id.toString() || "",
      user: user ,
    }

    next();

  }
  catch (error) {
    return res.status(401).json({ message: "Unauthorised" });
  }
}




