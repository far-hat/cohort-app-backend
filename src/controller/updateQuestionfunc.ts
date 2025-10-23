import AppDataSource from "../db/dataSource";
import { Questions } from "../entities/Questions";
import { Quiz } from "../entities/Quiz";

type Questions ={
    questions : QuestionUpdateRequest[]
}

export type QuestionUpdateRequest = {
    question_id : number;
    question_text : string;
    options : OptionRequest[]
}
type OptionRequest = {
    option_id : number;
    option_text : string;
    correct_option : string;
}

const quizRepository = AppDataSource.getRepository(Quiz);

const questionRepository = AppDataSource.getRepository(Questions);


export const updateQuestions = async (questionsData : QuestionUpdateRequest,quizId: number,)  => {

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
        //fetch quiz
        const quiz = await quizRepository.findOne({
        where: {
                quiz_id: Number(quizId)
            },
            relations: ['questions', 'questions.options']
    });
    if(!quiz){
        return "Quiz not found";
    }
        //fetch all questions
        const existingQuestions = quiz.questions;
        const existingQuestionsMap = new Map();
        existingQuestions.forEach(ques => {
            existingQuestionsMap.set(ques.question_id,ques.question_text);
        });
        //fetch all options

        const existingOptions= quiz
    } catch (error) {
        
    }

} 