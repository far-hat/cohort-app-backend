import express from 'express';
import { CreateCourse, ViewCourseById, ViewCourses } from '../controller/CoursesController';
import { courseCreationValidator } from '../validators/courseValidator';
import { errorHandler } from '../middleware/errorHandler';
import { jwtCheck, jwtParse } from '../middleware/auth';

const router = express.Router();

//api/course

router.post("/create",jwtCheck, jwtParse,courseCreationValidator,CreateCourse,errorHandler);

router.get("/view",jwtCheck, jwtParse,ViewCourses,errorHandler);

router.get("/view/:id",jwtCheck,jwtParse,ViewCourseById,errorHandler);

export default router;