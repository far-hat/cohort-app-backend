
import AppDataSource from "../db/dataSource";
import { Questions } from "../entities/Questions";
import { Quiz } from "../entities/Quiz";
import { Options } from "../entities/Options";
import { error } from "console";
import { In } from "typeorm";

export type QuestionsUpdateRequest = {
    questions: QuestionUpdateRequest[]
}

export type QuestionUpdateRequest = {
    question_id: number;
    question_text: string;
    options: OptionRequest[]
}
type OptionRequest = {
    option_id: number;
    option_text: string;
    correct_option: string;
}

const quizRepository = AppDataSource.getRepository(Quiz);

const questionRepository = AppDataSource.getRepository(Questions);


export const updateQuestions = async (questions: QuestionUpdateRequest[], quizId: number,) => {

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
        if (!quiz) {
            return "Quiz not found";
        }
        //fetch all questions

        const existingQuestions = quiz.questions;
        const existingQuestionsMap = new Map(existingQuestions.map(q => [q.question_id, q]));

        const newQuestionsMap = new Map(questions.map(q => [q.question_id, q]));

        const questionsToCreate: QuestionUpdateRequest[] = [];
        const questionsToUpdate: QuestionUpdateRequest[] = [];
        const questionsIdsToDelete: number[] = [];

        for (const newQuestion of questions) {
            if (!newQuestion.question_id || newQuestion.question_id === 0) {
                questionsToCreate.push(newQuestion);
            }
            else if (existingQuestionsMap.has(newQuestion.question_id)) {
                const existingQuestion = existingQuestionsMap.get(newQuestion.question_id);
                if (existingQuestion?.question_text !== newQuestion.question_text) {
                    questionsToUpdate.push(newQuestion);
                }
            }
        }

        for (const existingQuestion of existingQuestions) {
            if (!newQuestionsMap.has(existingQuestion.question_id)) {
                questionsIdsToDelete.push(existingQuestion.question_id);
            }
        }

        if (questionsIdsToDelete.length > 0) {
            await queryRunner.manager.delete(Options,{ 
        question: { question_id: In(questionsIdsToDelete) } })

            await queryRunner.manager
                .createQueryBuilder()
                .delete()
                .from(Questions)
                .where("question_id IN (:...questionIds)", { questionIds: questionsIdsToDelete })
                .execute();
        }

        for (const questionToUpdate of questionsToUpdate) {
            await queryRunner.manager.update(Questions,
                { question_id: questionToUpdate.question_id },
                { question_text: questionToUpdate.question_text }
            );

            await updateOptionsForQuestion(queryRunner, questionToUpdate);
        }

        for (const questionToCreate of questionsToCreate) {
            const newQuestion = queryRunner.manager.create(Questions,
                {
                    question_text: questionToCreate.question_text,
                    quiz: quiz
                }
            );

            const savedQuestion = await queryRunner.manager.save(newQuestion);

            await createOptionsForQuestions(queryRunner, savedQuestion, questionToCreate.options)
        }

        //existing question with no modfication but option modification

        for (const newQuestion of questions) {
            if (newQuestion.question_id && newQuestion.question_id !== 0 && !questionsToUpdate.find(q => q.question_id === newQuestion.question_id)) {
                await updateOptionsForQuestion(queryRunner, newQuestion);
            }
        }

        await queryRunner.commitTransaction();
        return {
            created: questionsToCreate.length,
            updated: questionsToUpdate.length,
            deleted: questionsIdsToDelete.length,
            message: "Questions updated successfully"
        };

    } catch (error) {
        await queryRunner.rollbackTransaction();
        console.error("Transaction failed", error);
        throw new Error("Failed to updated questions");
    } finally {
        await queryRunner.release();
    }

}


//========= Update options ==========



async function updateOptionsForQuestion(queryRunner: any, questionData: QuestionUpdateRequest) {

    interface OptionEntity {
        option_id: number;
        option_text: string;
        correct_option: boolean;
        question: Questions;
    }
    const existingOptions = await queryRunner.manager.find(Options, {
        where: { question: { question_id: questionData.question_id } }
    });

    const existingOptionsMap = new Map(existingOptions.map((opt: OptionEntity) => [opt.option_id, opt]));

    const newOptionsMap = new Map(questionData.options.map(opt => [opt.option_id, opt]));

    const optionsToCreate: OptionRequest[] = [];
    const optionsToUpdate: OptionRequest[] = [];
    const optionIdsToDelete: number[] = [];

    for (const newOption of questionData.options) {
        if (!newOption.option_id || newOption.option_id === 0) {
            optionsToCreate.push(newOption);
        } else if (existingOptionsMap.has(newOption.option_id)) {
            const existingOption = existingOptionsMap.get(newOption.option_id);
            if (!existingOption) {
                
                console.error(`Option with id ${newOption.option_id} not found`);
                throw new Error(`Option with id ${newOption.option_id} not found`);
            }

            if ((existingOption as any).option_text !== newOption.option_text || (existingOption as any).correct_answer !== newOption.correct_option) {
                optionsToUpdate.push(newOption);
            }
        }
    }

    for (const existingOption of existingOptions) {
        if (!newOptionsMap.has(existingOption.option_id)) {
            optionIdsToDelete.push(existingOption.option_id);
        }
    }

    if (optionIdsToDelete.length > 0) {
        await queryRunner.manager
                .createQueryBuilder()
                .delete()
                .from(Options)
                .where("option_id IN (:...optionIds)", { optionIds: optionIdsToDelete })
                .execute();
    }

    for (const optionToUpdate of optionsToUpdate) {
        await queryRunner.manager.update(Options,
            { option_id: optionToUpdate.option_id },
            {
                option_text: optionToUpdate.option_text,
                correct_option: optionToUpdate.correct_option
            }
        );
    }

    //option create 
    for (const optionToCreate of optionsToCreate) {
        const question = await queryRunner.manager.findOne(Questions, {
            where: { question_id: questionData.question_id }
        });

        const newOption = queryRunner.manager.create(Options, {
            option_text: optionToCreate.option_text,
            correct_option: optionToCreate.correct_option,
            question: question
        });

        await queryRunner.manager.save(newOption);
    }
}

async function createOptionsForQuestions(queryRunner: any, question: Questions, options: OptionRequest[]) {
    for (const optionData of options) {
        const newOption = queryRunner.manager.create(Options, {
            option_text: optionData.option_text,
            correct_option: optionData.correct_option,
            question: question
        });

        await queryRunner.manager.save(newOption);
    }
}