import { Router } from "express";
import { QuizSessionService } from "../services/quizSessionService";
import { QuizSessionController } from "../controller/QuizSessionController";
import { jwtParse } from "../middleware/auth";
const router = Router();



const quizSessionService = new QuizSessionService();
const quizSessionController = new QuizSessionController(quizSessionService);


router.post('/:quiz_id/start',jwtParse,quizSessionController.startQuiz.bind(quizSessionController));
router.post('/:quiz_id/stop',jwtParse,quizSessionController.stopQuiz.bind(quizSessionController));
router.post('/:quiz_id/pause',jwtParse,quizSessionController.pauseQuiz.bind(quizSessionController));
router.post('/:quiz_id/resume',jwtParse,quizSessionController.resumeQuiz.bind(quizSessionController));
router.get('/:quiz_id/state',jwtParse,quizSessionController.getQuizState.bind(quizSessionController));
router.post('/:quiz_id/join',jwtParse,quizSessionController.joinQuiz);
export default router;