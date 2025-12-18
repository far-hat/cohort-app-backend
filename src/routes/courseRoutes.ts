import express from 'express';
import { CreateCourse } from '../controller/CoursesController';

const router = express.Router();

//api/course

router.post("/create",CreateCourse);

export default router;