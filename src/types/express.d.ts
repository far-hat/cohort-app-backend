import { Quiz } from "../entities/Quiz";
import { User } from "../entities/User";

declare global {
    namespace Express {
        interface Request {
            user? : User,
            quiz? : Quiz,
            userId? : string,
            auth0Id? : string,
        }

    }
}



export {};