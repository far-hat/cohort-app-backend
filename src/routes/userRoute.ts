import express from 'express'
import { createCurrentUser, updateCurrentUser } from '../controller/UserController';
import { jwtCheck, jwtParse } from '../middleware/auth';
import { validateUserRequest } from '../middleware/validation';
const router =express.Router();

// api/user
router.post("/",jwtCheck,createCurrentUser);

//api/user-profile
router.put("/",jwtCheck,jwtParse,validateUserRequest,updateCurrentUser);

export default router;

