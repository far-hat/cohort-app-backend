import express from 'express';
import { CreateCourse, ViewCourseById, ViewCourses } from '../controller/CoursesController';
import { courseCreationValidator } from '../validators/courseValidator';
import { errorHandler } from '../middleware/errorHandler';
import { jwtParse } from '../middleware/auth';

const router = express.Router();

//api/course

router.post("/create",jwtParse,courseCreationValidator,CreateCourse,errorHandler);

router.get("/view", jwtParse,ViewCourses,errorHandler);

router.get("/view/:id",jwtParse,ViewCourseById,errorHandler);

export default router;