import AppDataSource from "../db/dataSource";
import { Request, Response } from "express";


const questionRepository  = AppDataSource.getRepository('questions');
const optionRepository = AppDataSource.getRepository('options');

export const AddQuestions = async(req:Request , res: Response) => {
    try {
        const question = questionRepository.create({
            question_text : req.body.questionText,
            
        })
    } catch (error) {
        
    }
}