import express from 'express'
import { createCohort, updateCohort, viewCohortById } from '../controller/CohortController';
import { cohortCreationValidator } from '../validators/cohortValidator';
import { errorHandler } from '../middleware/errorHandler';
import {  jwtParse } from '../middleware/auth';

const router = express.Router();

router.post("/create",jwtParse,cohortCreationValidator,createCohort,errorHandler);
router.put("/update/:id",jwtParse,updateCohort,errorHandler);
router.get("/view/:id",viewCohortById,errorHandler);

export default router;