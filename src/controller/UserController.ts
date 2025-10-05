import { Request,Response } from "express"
import { User } from "../entities/User";
import AppDataSource from "../db/dataSource";

const userRepository = AppDataSource.getRepository(User);

export const createCurrentUser = async (req:Request,res:Response)=> {
    // check if the user exists
    try {
        const {auth0Id }= req.body;
        
        const existingUser = await userRepository.findOneBy({auth0Id});
        if(existingUser){
            return res.status(200).json(existingUser);
        }
        //create if user does not exist
        const newUser = userRepository.create({
            auth0Id:req.body.auth0Id,
            user_name:req.body.user_name || req.body.email.split("@")[0],
            email:req.body.email,
        });
        await userRepository.save(newUser);
        res.status(201).json(newUser) ;
        
    } catch (error) {
        console.log("Error creating user");
        res.status(500).send({message : "Error creating user",error});
        
    }
    

    // return the user object
};

export const updateCurrentUser = async (req:Request, res: Response) =>  {
    try {
        const {role,isActive} =req.body;
        const user = await userRepository.findOneBy({user_id:Number(req.userId)})

        if(!user){
            return res.status(404).json({message:"User not found"});
        }
        user.role = role;
        user.isActive = isActive;
        //user.password_hash = encryptedPassword;

        await userRepository.save(user);
        res.send(user);
        
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Error updating user"});
    }
}
