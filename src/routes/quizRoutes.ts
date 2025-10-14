import express from 'express';
import { CreateMyQuiz, GetAllQuizzes, GetMyQuizzes, ViewQuiz } from '../controller/QuizController';
import { jwtCheck, jwtParse } from '../middleware/auth';

const router = express.Router();
//api/quiz
router.post("/create",CreateMyQuiz);

router.get("/getAll",GetAllQuizzes);

router.get("/my_quizzes",jwtCheck,jwtParse,GetMyQuizzes);

router.get("/view-quiz/:id",ViewQuiz);

export default router;
