import { Router } from "express";
import { QuizSessionService } from "../services/quizSessionService";
import { QuizSessionController } from "../controller/QuizSessionController";
const router = Router();



const quizSessionService = new QuizSessionService();
const quizSessionController = new QuizSessionController(quizSessionService);


router.post('/:quiz_id/start',quizSessionController.startQuiz.bind(quizSessionController));
router.post('/:quiz_id/stop',quizSessionController.stopQuiz.bind(quizSessionController));
router.post('/:quiz_id/pause',quizSessionController.pauseQuiz.bind(quizSessionController));
router.post('/:quiz_id/resume',quizSessionController.resumeQuiz.bind(quizSessionController));
router.get('/:quiz_id/state',quizSessionController.getQuizState.bind(quizSessionController));

export default router;