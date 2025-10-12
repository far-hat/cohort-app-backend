import express from 'express';
import { AddQuestions } from '../controller/QuestionsController';

const router = express.Router({ mergeParams: true });
//api/my/quiz
router.post("/add",AddQuestions);

export default router;
