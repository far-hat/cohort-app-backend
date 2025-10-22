import { Request, Response } from "express";
import { Quiz } from "../entities/Quiz";
import AppDataSource from "../db/dataSource";
import { Mentors } from "../entities/Mentor";
import { User } from "../entities/User";
import { Options } from "../entities/Options";
import { Questions } from "../entities/Questions";
import { QuizAttempt } from "../entities/QuizAttempt";
import { QuizAnswer } from "../entities/QuizAnswer";

export type CreateQuizRequest = {
    course_name : string;
    quiz_description : string;
    status: string;
    start_datetime? : string;
    end_datetime? : string;
};

const quizRepository = AppDataSource.getRepository(Quiz);
const mentorsRepository = AppDataSource.getRepository(Mentors);
const userRepository = AppDataSource.getRepository(User);
const optionsRepository = AppDataSource.getRepository(Options);
const questionRepository = AppDataSource.getRepository(Questions);
const quizAttemptRepository = AppDataSource.getRepository(QuizAttempt);
const quizAnswerRepository = AppDataSource.getRepository(QuizAnswer);

export const CreateMyQuiz = async (req: Request, res: Response) => {
    try {
        const auth0Id  = "google-oauth2|101280210633986786527";

        const user = await userRepository.findOneBy({ auth0Id });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const mentor = await mentorsRepository.findOne({
            where: { user: { user_id: user.user_id } },
            relations: ["user"],
        });
        console.log("Mentor object before saving quiz:", mentor);
        if (!mentor) {
            return res.status(404).json({ message: "Mentor not found" });
        }

        const quiz = quizRepository.create({
            course_name: req.body.course_name,
            status : req.body.status,
            quiz_description: req.body.quiz_description,
            start_datetime: req.body.start_datetime,
            end_datetime: req.body.end_datetime,
            mentor,
        })
        await quizRepository.save(quiz);
        return res.status(201).json(quiz);
    } catch (error) {
        console.log("Error creating quiz", error);
        return res.status(500).send({ message: "Error creating quiz", error });

    }
}

export const GetAllQuizzes = async (req:Request,res: Response) => {
    try {
        const quizzes = await quizRepository.find({ order: { quiz_id: 'ASC' } });
        if (!quizzes) {
             res.status(404).json({ message: "No Quiz found" });
        }
         res.status(200).json(quizzes);
    } catch (error) {
        console.error(error);
         res.status(500).send("Error fetching restaurant");
    }
}


export const GetMyQuizzes = async (req: Request, res: Response) => {
    try {
        const auth0Id = req.auth0Id;

        const user = await userRepository.findOneBy({ auth0Id });
        if (!user) {
             return res.status(404).json({ message: "User not found" });
        }

        const mentor = await mentorsRepository.findOne({
            where: { user: { user_id: user.user_id  } },
            relations: ["user"],
        });
        console.log(mentor);

        if (!mentor) {
            return res.status(404).json({ message: "Mentor not found" });
        }

        const quizzes = await quizRepository.find({
            where: {
                mentor: {
                    mentor_id: mentor.mentor_id,
                    
                },
            },
            relations: ["mentor"],
        });
        if(!quizzes){
            return res.status(201).json({message: "No quiz found"})
        }

        return res.status(200).json(quizzes);
    } catch (error) {
        console.error("Error fetching quizzes:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const ViewQuiz = async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        if (!id) {
            return res.status(400).json({ message: "Quiz ID is required" });
        }
        
        const quiz = await quizRepository.findOne({
             where: {
                quiz_id: Number(id)
            },
            relations: ['questions', 'questions.options']
        });

        if(!quiz){
            return res.status(404).json({ message: "Quiz not found" });
        }

        return res.status(200).json(quiz);

    } catch (error) {
        console.error("Error fetching quiz:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const deleteQuiz = async(req: Request, res : Response) => {
    try {
        const id = req.params.id;
        const quizId = Number(id);

        // await optionsRepository.delete({
        //     question : {
        //         quiz : {
        //             quiz_id : quizId
        //         }
        //     }
        //  });

        // await questionRepository.delete({
        //    quiz : {
        //     quiz_id : quizId
        //    } 
        // });

        // await quizRepository.delete(quizId);

/////////////////////////////// ===============USING QUERY BUILDER ================ ////////////////
        // await optionsRepository
        //     .createQueryBuilder('option')
        //     .leftJoin('option.question','question')
        //     .where('quiz.quiz_id = :quizId' , { quizId})
        //     .delete()
        //     .execute()

        // await questionRepository
        //     .createQueryBuilder('question')
        //     .leftJoin('question.quiz' , 'quiz')
        //     .where('quiz.quiz_id = :quizId' , {quizId})
        //     .delete()
        //     .execute();

        // await quizRepository.delete(quizId);


        const questions = await questionRepository.find({
            where : {
                quiz : {
                    quiz_id : quizId
                }
            }
        });

        const questionIds = questions.map( q => q.question_id);
    
        if(questionIds.length > 0){
            await optionsRepository
            .createQueryBuilder()
            .delete()
            .where("question_id IN (:...questionIds)",{questionIds})
            .execute();
        }

        await questionRepository
            .createQueryBuilder()
            .delete()
            .where("quiz_id = :quizId", {quizId})
            .execute();
        
        await quizRepository.delete(quizId);

        return res.json(200).json({message : "Quiz deleted succesfully"})
    } catch (error) {
        console.error("Error deleting quiz:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const editQuiz = async(req : Request, res : Response) => {
    try {
        const id = req.params.id;
        const quizId = Number(id);
        const quizData : CreateQuizRequest = req.body;

        const quiz = await quizRepository.findOne({where : {quiz_id : quizId}});

        if(!quiz) {
            return res.status(404).json({message : "Quiz not found"});
        }

        await quizRepository
            .createQueryBuilder()
            .update()
            .set(quizData)
            .where("quiz_id = :quizId",{quizId})
            .execute();
            

        return res.status(200).json({message:"Quiz updated"});

    } catch (error) {
        console.error("Error updating quiz:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}
export type QuizSubmissionRequest = {
    responses : Record<string,string>;
}

export const submitQuiz = async (req:Request, res:Response) => {
    try {
        const {responses} : QuizSubmissionRequest = req.body;
        const quizId  = req.params.id;
        const auth0Id = req.auth0Id;

        if(!quizId || !responses || Object.keys(responses).length === 0){
            return res.status(400).json( { message : "Quiz ID and responses are required"});
        }

        const user = await userRepository.findOneBy({auth0Id});
        if(!user){
            return res.status(404).json({message : "User not found"});
        }

        const quiz = await quizRepository.findOne({
            where:{ quiz_id : Number(quizId)},
            relations : ['questions','questions.options']
        })

        if(!quiz){
            return res.status(404).json({nessage : "Quiz not found"});
        }

        await AppDataSource.transaction( async (transactionalEntityManager) => {
            const attempt = new QuizAttempt();
            attempt.user = user;
            attempt.quiz = quiz;
            attempt.total_questions = quiz.questions.length;


            let correctAnswers = 0;
            const answers : QuizAnswer [] = [];

            for(const [questionId,selectedOptionText] of Object.entries(responses) ){
                const question = await questionRepository.findOne({where: {question_id : Number(questionId)},
                relations: ['options']
            });

            if(!question){
                console.warn(`Question ${questionId} not found`);
                continue;
            }

            const selectedOption = question.options.find(
                option => option.option_text === selectedOptionText
            );

            if(!selectedOption){
              console.warn(`Option "${selectedOptionText}" not found for question ${questionId}`);
                continue;  
            }
            const isCorrect = selectedOption.correct_option;
            if(isCorrect){
                correctAnswers++;
            }

            const answer = new QuizAnswer();
            answer.question = question;
            answer.selected_option = selectedOption;
            answer.is_correct = isCorrect;
            answer.attempt = attempt;

            answers.push(answer);
            }

            attempt.score = correctAnswers;
            attempt.percentage = (correctAnswers/attempt.total_questions)*100;

            await transactionalEntityManager.save(QuizAttempt,attempt);
            await transactionalEntityManager.save(QuizAnswer,answers);


            return res.status(201).json({
                message : "Quiz submitted successfully"
            });
            
        })
    } catch (error) {
         console.error("Quiz submission error:", error);
        return res.status(500).json({ 
            message: "Error submitting quiz attempt",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
}

