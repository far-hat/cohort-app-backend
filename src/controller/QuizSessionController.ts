import { QuizSessionService } from "../services/quizSessionService";
import { Request,Response } from "express";

export class QuizSessionController {
    constructor(private quizSessionService : QuizSessionService){}

    async startQuiz(req : Request, res : Response) {
        try {
            const {quiz_id} = req.params;
            
            const id = Number(quiz_id);
            const quiz = await this.quizSessionService.startQuiz(Number(id));

            res.json({
                success: true,
                message: "Quiz started succesfully",
                data : quiz
            })
        } catch (error:any) {
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