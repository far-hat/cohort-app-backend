import { NextFunction, Request, Response } from "express";
import AppDataSource from "../db/dataSource";
import { User } from "../entities/User";
import { Cohort, CohortStatus } from "../entities/Cohorts";
import { Course } from "../entities/Courses";

export const createCohort = async(req: Request, res: Response,next : NextFunction) => {
    try {
        const auth0Id = req.auth0Id;
        const courseId = req.baseUrl.slice(-1);

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
            where: {course_id : Number(courseId)},
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


export const updateCohort = async(req:Request, res: Response, next: NextFunction) => {
    
    try {
        const auth0Id = req.auth0Id;
        const courseId = req.baseUrl.slice(-1);
        const cohortId = req.params.id;
        const updatedCohort = req.body;

        const user = await AppDataSource.getRepository(User).findOne({
            where : {auth0Id},
            relations : ["mentor"]
        });

        if(!user){
            return res.status(404).json({
                message: "User not found"
            });
        }

        if(user.role !== "mentor"){
            return res.status(403).json({
                message : "Forbidden, only mentors can manage cohort"
            });
        }

        if(!user.mentor){
            res.status(404).json({
                message : "Mentor not found"
            });
        }

        const cohort = await AppDataSource.getRepository(Cohort).findOne({
            where : {cohort_id : Number(cohortId)},
            relations : ["course"]
        });

        if(!cohort){
            return res.status(404).json({message : "Cohort not found"});
        }

        if( cohort.course.course_id !== Number(courseId)){
            return res.status(403).json({message : "Cohort does not belong to the course"});
        }

        await AppDataSource.getRepository(Cohort).createQueryBuilder()
        .update()
        .set(updatedCohort)
        .where("cohort_id = :cohortId",{cohortId})
        .execute();

        return res.status(200).json({message : "Cohort updated"});

 } catch (error) {
        next(error);
    }
}

export const viewCohortById = async(req : Request, res: Response, next : NextFunction) => {

    try {
        const auth0Id = req.auth0Id;
        const courseId = req.baseUrl.slice(-1);
        const cohortId = req.params.id;

        const user = await AppDataSource.getRepository(User).findOne({
            where : {auth0Id}
        });

        //if(!user) return res.status(404).json({message : "User not found"});

        const course = await AppDataSource.getRepository(Course).findOne({
            where : {course_id : Number(courseId)},
        });

        if(!course) return res.status(404).json({message : "Course not found"});

        //find returns an array of results even if there is only one cohort, it will retrieve it in array format
        const cohort = await AppDataSource.getRepository(Cohort).findOne({
            where : {cohort_id : Number(cohortId)},
            relations : ["course"]
        });

        if(!cohort) return res.status(404).json({message : "Cohort not found"});

        return res.status(200).json(cohort);

    } catch (error) {
        next(error);
    }

}