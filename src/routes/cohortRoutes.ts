import express from 'express'
import { createCohort } from '../controller/CohortController';
import { cohortCreationValidator, courseIdValidator } from '../validators/cohortValidator';
import { errorHandler } from '../middleware/errorHandler';
import { jwtCheck, jwtParse } from '../middleware/auth';

const router = express.Router();

router.post("/create",jwtCheck,jwtParse,cohortCreationValidator,createCohort,errorHandler);

export default router;