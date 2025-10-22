import express from 'express';
import { CreateMyQuiz, deleteQuiz, editQuiz, GetAllQuizzes, GetMyQuizzes, submitQuiz, ViewQuiz } from '../controller/QuizController';
import { jwtCheck, jwtParse } from '../middleware/auth';

const router = express.Router();
//api/quiz
router.post("/create",CreateMyQuiz);

router.get("/getAll",GetAllQuizzes);

router.get("/my_quizzes",jwtCheck,jwtParse,GetMyQuizzes);

router.get("/view-quiz/:id",ViewQuiz);

router.delete("/delete/:id",deleteQuiz);

router.put("/edit/:id",editQuiz);

router.post("/attempt/:id",submitQuiz);

export default router;
