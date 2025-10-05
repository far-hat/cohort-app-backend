import { Response,Request } from "express";
import { Quiz } from "../entities/Quiz";
import AppDataSource from "../db/dataSource";

const quizRepository = AppDataSource.getRepository(Quiz);

export const CreateMyQuiz = async (req: Request, res: Response)=> {

    try {
        const quiz = quizRepository.create({
            course_name : req.body.course_name,
            start_datetime : req.body.start_datetime,
            end_datetime : req.body.end_datetime,
        })
        await quizRepository.save(quiz);
        res.status(201).json(quiz);
    } catch (error) {
        console.log("Error creating quiz",error);
        res.status(500).send({message : "Error creating quiz",error});

    }
}