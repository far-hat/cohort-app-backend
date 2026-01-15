import { QuizSessionService } from "../services/quizSessionService";
import { Request,Response } from "express";

export class QuizSessionController {
    constructor(private quizSessionService : QuizSessionService){}

   

    async startQuiz(req : Request, res : Response) {
        try {

            const {quiz_id} = req.params;
            
            const id = Number(quiz_id);

            if (isNaN(id)) {
                console.log(`Invalid quiz ID: ${quiz_id}`);
                return res.status(400).json({
                    success: false,
                    message: "Invalid quiz ID format"
                });
            }

            const quiz = await this.quizSessionService.startQuiz(id,req);

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

           const id = Number(quiz_id);

           if (isNaN(id)) {
                console.log(`Invalid quiz ID: ${quiz_id}`);
                return res.status(400).json({
                    success: false,
                    message: "Invalid quiz ID format"
                });
            }
           
           const quiz = await this.quizSessionService.pauseQuiz(
            id);


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

            const id = Number(quiz_id);

           if (isNaN(id)) {
                console.log(`Invalid quiz ID: ${quiz_id}`);
                return res.status(400).json({
                    success: false,
                    message: "Invalid quiz ID format"
                });
            }

            const quiz = await this.quizSessionService.resumeQuiz(id);

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
            const id = Number(quiz_id);

           if (isNaN(id)) {
                console.log(`Invalid quiz ID: ${quiz_id}`);
                return res.status(400).json({
                    success: false,
                    message: "Invalid quiz ID format"
                });
            }
            const quiz = await this.quizSessionService.stopQuiz(id);

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
            const id = Number(quiz_id);

           if (isNaN(id)) {
                console.log(`Invalid quiz ID: ${quiz_id}`);
                return res.status(400).json({
                    success: false,
                    message: "Invalid quiz ID format"
                });
            }
            const quiz = await this.quizSessionService.getQuizState(id);

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

    async joinQuiz(req : Request, res: Response) {
        const auth0Id = req.auth0Id;
        const quizId = Number(req.params.quiz_id);

        const data = await this.quizSessionService.createAttempt(auth0Id,quizId);
        res.json({success : true, data});

    }
}