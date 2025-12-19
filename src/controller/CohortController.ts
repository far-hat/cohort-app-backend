import { NextFunction, Request, Response } from "express";
import AppDataSource from "../db/dataSource";
import { User } from "../entities/User";
import { Cohort, CohortStatus } from "../entities/Cohorts";
import { Course } from "../entities/Courses";

export const createCohort = async(req: Request, res: Response,next : NextFunction) => {
    try {
        const auth0Id = req.body.auth0Id;
        const courseId = Number(req.params.courseId);

        const user = await AppDataSource.getRepository(User).findOne({
            where: {auth0Id},
            relations : ["mentor"]
        });

        if(!user){
            return res.status(404).json({messsage : "User not found"});
        }

        if(user.role !== "mentor"){
            return res.status(403).json({message : "Forbidden. Only mentors can create a cohort"});
        }

        if(!user.mentor){
            return res.status(404).json({messsage : "Mentor not found"});
        }

        const courseRepository = await AppDataSource.getRepository(Course);

        const course = await courseRepository.findOne({
            where: {course_id : courseId},
            relations : ["mentor"]
        });

        if(!course){
            return res.status(404).json({message : "Course not found"});
        }

        if(course.mentor.mentor_id !== user.mentor.mentor_id){
            return res.status(403).json({message : "You do not own this course"});
        }



        const cohortRepository = AppDataSource.getRepository(Cohort)

        const cohort = cohortRepository.create({
            cohort_name : req.body.cohort_name,
            status : CohortStatus.SCHEDULED,
            start_date : req.body.start_date,
            end_date : req.body.end_date,
            course : course,
        })

        await cohortRepository.save(cohort);
        return res.status(201).json({message : "Cohort created successfully",cohort})

    } catch (error) {
        next(error);
    }
}