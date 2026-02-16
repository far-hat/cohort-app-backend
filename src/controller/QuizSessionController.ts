import { QuizSessionService } from "../services/quizSessionService2";
import { Request, Response } from "express";

export class QuizSessionController {
    constructor(private quizSessionService: QuizSessionService) { }
    async startQuiz(req: Request, res: Response) {
        try {
            if (!req.quiz || !req.auth?.user) {
                return res.status(500).json({ message: "Request context missing" });
            }

            const quiz = req.quiz;
            if (!quiz) {
                throw new Error("Quiz missing from request context");
            }

            const updatedQuiz = await this.quizSessionService.startQuiz(quiz);
            console.log(`Quiz ${quiz.quiz_id} started successfully`);

            res.json({
                success: true,
                message: "Quiz started succesfully",
                data: updatedQuiz
            })
        } catch (error: any) {
            console.error(` START QUIZ ERROR for quiz ${req.params.quiz_id}:`, error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }


    async pauseQuiz(req: Request, res: Response) {
        try {
            if (!req.quiz || !req.auth?.user) {
                return res.status(500).json({ message: "Request context missing" });
            }

            const quiz = req.quiz;
            if (!quiz) {
                throw new Error("Quiz missing from request context");
            }
            const updatedQuiz = await this.quizSessionService.pauseQuiz(quiz);

            res.json({
                success: true,
                message: "Quiz paused successfully",
                data: updatedQuiz
            });
        } catch (error: any) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async resumeQuiz(req: Request, res: Response) {
        try {

            if (!req.quiz || !req.auth?.user) {
                return res.status(500).json({ message: "Request context missing" });
            }

            const quiz = req.quiz;
            if (!quiz) {
                throw new Error("Quiz missing from request context");
            } const updatedQuiz = await this.quizSessionService.resumeQuiz(quiz);

            res.json({
                success: true,
                message: "Quiz resumed successfully",
                data: updatedQuiz
            });
        } catch (error: any) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async stopQuiz(req: Request, res: Response) {
        try {
            if (!req.quiz || !req.auth?.user) {
                return res.status(500).json({ message: "Request context missing" });
            }

            const quiz = req.quiz;
            if (!quiz) {
                throw new Error("Quiz missing from request context");
            } 
            const reason  = req.body?.reason ?? "mentor_stopped";
            const updatedQuiz = await this.quizSessionService.stopQuiz(quiz, reason);

            res.json({
                success: true,
                message: "Quiz stopped successfully",
                data: updatedQuiz
            });
        } catch (error: any) {
            res.status(400).json({
                success: false,
                message: error.message
            })
        }
    }

    async getQuizState(req: Request, res: Response) {
        try {
            if (!req.quiz || !req.auth?.user) {
                return res.status(500).json({ message: "Request context missing" });
            }

            const quiz = req.quiz;
            if (!quiz) {
                throw new Error("Quiz missing from request context");
            } const updatedQuiz = await this.quizSessionService.getQuizState(quiz);

            res.json({
                success: true,
                data: updatedQuiz,
            });
        } catch (error: any) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async joinQuiz(req: Request, res: Response) {
        try {
            const user = req.auth?.user!;
            const quiz = req.quiz!;

            const data = await this.quizSessionService.createAttempt(user, quiz);
            res.json({ success: true, data });

        } catch (error: any) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async getMentorSnapshot(req: Request, res: Response) {
  try {
    if (!req.quiz || !req.auth?.user) {
      return res.status(500).json({ message: "Request context missing" });
    }

    const snapshot = await this.quizSessionService.getMentorSnapshot(req.quiz);

    res.json({
      success: true,
      data: snapshot
    });

  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}


    async createAttempt(req: Request, res: Response) {
        try {
            const user = req.auth?.user!;
            const quiz = req.quiz!;

            const data = await this.quizSessionService.createAttempt(user, quiz);

            res.json({
                success: true,
                message: "Attempt created successfully",
                data
            });

        } catch (error: any) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async getAttemptDetails(req: Request, res: Response) {
  try {
    const { attemptId } = req.params;
    const data = await this.quizSessionService.getAttemptDetails(Number(attemptId));
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async submitQuiz(req: Request, res: Response) {
  try {
    const { attemptId } = req.params;
    
    const data = await this.quizSessionService.submitAttempt(Number(attemptId));
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
}

}