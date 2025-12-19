import express from 'express'
import { createCohort } from '../controller/CohortController';
import { cohortCreationValidator, courseIdValidator } from '../validators/cohortValidator';
import { errorHandler } from '../middleware/errorHandler';

const router = express.Router();

router.post("/create",cohortCreationValidator,createCohort,errorHandler);

export default router;