import AppDataSource from "../db/dataSource";
import { Request, Response } from "express";
import { Questions } from "../entities/Questions";
import { Options } from "../entities/Options";
import { Quiz } from "../entities/Quiz";

const quizRepository = AppDataSource.getRepository(Quiz);




export const AddQuestions = async(req:Request , res: Response) => {
    const { quizId } = req.params;
    const quiz = await quizRepository.findOne({
        where : {quiz_id : Number(quizId)} ,
    });
    if(!quiz){
        return res.status(404).json({message:"Quiz not found"});
    }

    const {questions} = req.body;
    console.log(questions);

    if(!Array.isArray(questions)){
        return res.status(400).json("Expected an array of questions.");
    }

    try {
        await AppDataSource.transaction(async (transactionalEntityManager) => {
            for (const q of questions ){
                if(!q.question_text || !Array.isArray(q.options) || q.options.length==0){
                    throw new Error("Invalid question format");
                }

                const question = transactionalEntityManager.create(Questions, {
                    question_text: q.question_text,
                    quiz : quiz
                });

                const savedQuestion = await transactionalEntityManager.save(question);

                for(const opt of q.options){
                    const option = transactionalEntityManager.create(Options, {
                        option_text : opt,
                        correct_option : q.correct_answer === opt,
                        question : savedQuestion,
                    });
                    await transactionalEntityManager.save(option); 
                }
            }
        });

        return res.status(201).json({message:"Question saved successfully"});
    } catch (error) {
        console.error("Transaction failed",error);
        return res.status(500).json({message : "Failed to save question"})
    }

}

