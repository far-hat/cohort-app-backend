import { Request,Response } from "express"
import { User } from "../entities/User";
import { Mentors } from "../entities/Mentor";
import AppDataSource from "../db/dataSource";

const userRepository = AppDataSource.getRepository(User);
const mentorsRepository = AppDataSource.getRepository(Mentors);

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
        const {role} = req.body || "Mentor";
        const auth0Id = req.body.auth0Id;

        const user = await userRepository.findOneBy({ auth0Id });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        if(role == "mentor" ){
            try {
                const newMentor = mentorsRepository.create( {
                    full_name : req.body.full_name,
                    phone : req.body.phone,
                    expertise : req.body.expertise,
                    user: user,
                });

                await mentorsRepository.save(newMentor);
                return res.status(200).send(newMentor);

            } catch (error) {
                console.log(error);
                return res.status(500).json({message: "Error updating the user."})
            }

        }
        //await userRepository.save(user);
        
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Error updating user"});
    }
}
