import express from 'express'
import { createCurrentUser, updateCurrentUser } from '../controller/UserController';
import {  jwtParse } from '../middleware/auth';
const router =express.Router();

// api/user
router.post("/",jwtParse,createCurrentUser);

//api/user/update
router.put("/update",jwtParse,updateCurrentUser);

export default router;

