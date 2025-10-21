import { Request,Response } from "express"
import { User } from "../entities/User";
import { Mentors } from "../entities/Mentor";
import AppDataSource from "../db/dataSource";
import { Candidate } from "../entities/Candidate";

const userRepository = AppDataSource.getRepository(User);
const mentorsRepository = AppDataSource.getRepository(Mentors);
const candidatesRepository = AppDataSource.getRepository(Candidate);

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
        const {role} = req.body;
        const auth0Id = req.auth0Id;

        const user = await userRepository.findOneBy({ auth0Id });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        user.role = role;
        await userRepository.save(user);

        switch(role.toLowerCase()){
            case "mentor" : 
                return await handleMentorRegistration(user,req.body,res);
            case "candidate" :
                return await handleCandidateRegistration(user,req.body,res);
            case "admin" : 
                return res.status(200).json(user);
            default:
                return res.status(400).json({message : "Invalid role specified"});
        }
        
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Error updating user"});
    }
};

const handleMentorRegistration= async(user : User, data: any, res:Response) => {
    try {
        const {full_name,expertise,phone} = data;

        const existingMentor = await mentorsRepository.findOne({
            where: { user : {user_id : user.user_id}}
        });

        if(existingMentor){
            existingMentor.full_name = full_name;
            existingMentor.expertise = expertise;
            existingMentor.phone = phone;
            await mentorsRepository.save(existingMentor);
            return res.status(200).json({user,mentor:existingMentor});
        }
        else{
            const newMentor = mentorsRepository.create({
                full_name : full_name,
                expertise : expertise,
                phone: phone,
                user : user
            });
            await mentorsRepository.save(newMentor);
            return res.status(201).json({user,mentor:newMentor});
        }
    } catch (error) {
        console.error("Mentor creation error");
        return res.status(500).json({message : "Error creating mentor"});
    }
}

const handleCandidateRegistration = async(user : User, data : any , res : Response) => {
    try {
        const {full_name,phone,education_level} = data;
        const existingCandidate = await candidatesRepository.findOne({
            where: { user : {user_id : user.user_id}}
        });
        
        if(existingCandidate){
            existingCandidate.full_name = full_name;
            existingCandidate.phone = phone;
            existingCandidate.education_level = education_level;
            await candidatesRepository.save(existingCandidate);
            return res.status(200).json({user,candidate:existingCandidate});

        }
        else{
            const newCandidate = candidatesRepository.create({
                full_name : full_name,
                phone : phone,
                education_level : education_level,
                
            });
            await candidatesRepository.save(newCandidate);
            return res.status(201).json({user,candidate : newCandidate});
        }
    } catch (error) {
        console.error("Candidate creation error:", error);
        return res.status(500).json({ message: "Error creating candidate profile" });
    }
}
