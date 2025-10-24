import express from 'express';
import { AddQuestions, EditQuestions } from '../controller/QuestionsController';

const router = express.Router({ mergeParams: true });

router.post("/add",AddQuestions);

router.put("/edit",EditQuestions);

export default router;
