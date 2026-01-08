import { QuizSessionService } from "../services/quizSessionService";
import { Request,Response } from "express";

export class QuizSessionController {
    constructor(private quizSessionService : QuizSessionService){}

    async startQuiz(req : Request, res : Response) {
        try {
            console.log(` START QUIZ API CALLED: quiz_id = ${req.params.quiz_id}`);
            console.log(` Headers:`, req.headers);

            const {quiz_id} = req.params;
            
            const id = Number(quiz_id);

            if (isNaN(id)) {
                console.log(`Invalid quiz ID: ${quiz_id}`);
                return res.status(400).json({
                    success: false,
                    message: "Invalid quiz ID format"
                });
            }

            const quiz = await this.quizSessionService.startQuiz(id);

             console.log(`Quiz ${id} started successfully`);

            res.json({
                success: true,
                message: "Quiz started succesfully",
                data : quiz
            })
        } catch (error:any) {
            console.error(` START QUIZ ERROR for quiz ${req.params.quiz_id}:`, error);
            console.error(` Error stack:`, error.stack);
            res.status(400).json({
                success : false,
                message : error.message
            });
        }
    }


    async pauseQuiz(req: Request, res : Response) {
        try {
           const {quiz_id} = req.params;
           
           const quiz = await this.quizSessionService.pauseQuiz(
            Number(quiz_id));

           res.json({
            success : true,
            message : "Quiz paused successfully",
            data : quiz
           });
        } catch (error : any) {
            res.status(400).json({
                success : false,
                message : error.message
            });
        }
    }

    async resumeQuiz(req : Request, res : Response){
        try {
            const {quiz_id} = req.params;

            const quiz = await this.quizSessionService.resumeQuiz(
                Number(quiz_id));

            res.json({
                success : true,
                message : "Quiz resumed successfully",
                data : quiz
            });
        } catch (error :any) {
            res.status(400).json({
                success: false,
                message : error.message
            });
        }
    }

    async stopQuiz(req : Request, res : Response){
        try {
            const {quiz_id} = req.params;
            const quiz = await this.quizSessionService.stopQuiz(
                Number(quiz_id));

            res.json({
                success: true,
                message : "Quiz stopped successfully",
                data : quiz
            });
        } catch (error : any) {
            res.status(400).json({
                success : false,
                message : error.message
            })
        }
    }

     async getQuizState(req: Request, res: Response) {
        try {
            const { quiz_id } = req.params;
            const quiz = await this.quizSessionService.getQuizState(Number(quiz_id));

            res.json({
                success: true,
                data: quiz
            });
        } catch (error: any) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
}