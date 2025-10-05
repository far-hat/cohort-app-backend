import express from 'express';
import { CreateMyQuiz } from '../controller/QuizController';

const router = express.Router();
//api/my/quiz
router.post("/create",CreateMyQuiz);

export default router;
