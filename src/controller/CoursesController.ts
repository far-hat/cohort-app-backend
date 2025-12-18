import AppDataSource from "../db/dataSource";
import { Request,Response } from "express"; 
import { User } from "../entities/User";
import { Course, CourseStatus } from "../entities/Courses";

const courseRepository = AppDataSource.getRepository(Course);

export const CreateCourse = async(req : Request, res : Response) => {
    try {
        //const auth0Id = req.auth0Id;
        const auth0Id = req.body.auth0Id;

        const user = await AppDataSource.getRepository(User).findOne({
            where: {auth0Id},
            relations : ["mentor"]});

        if(!user){
            return res.status(404).json({message: "User not found"});
        }

        if(user.role !== "mentor"){
            return res.status(403).json({message : "Forbidden. Only mentors can create course"});
        }

        if(!user.mentor){
            return res.status(404).json({message : "Mentor info not found"});
        }

        const course = courseRepository.create({
                course_title : req.body.course_title,
                description : req.body.description,
                status : CourseStatus.DRAFT,
                mentor : user.mentor,
            });
        await courseRepository.save(course);
        return res.status(201).json(course);

    } catch (error) {
        console.log("Error creating course");
        return res.status(500).send({ message: "Error creating course", error });
    }


}