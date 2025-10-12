import express from 'express';
import { CreateMyQuiz, GetAllQuizzes, GetMyQuizzes } from '../controller/QuizController';

const router = express.Router();
//api/my/quiz
router.post("/create",CreateMyQuiz);

router.get("/getAll",GetAllQuizzes);

router.get("/my_quizzes",GetMyQuizzes);

export default router;
