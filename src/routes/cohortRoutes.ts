import express from 'express'
import { createCohort } from '../controller/CohortController';

const router = express.Router();

router.post("/create",createCohort);

export default router;