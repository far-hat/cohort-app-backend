import AppDataSource from "../db/dataSource";
import { Quiz } from "../entities/Quiz";
import { socketService } from "../index";

export class QuizSessionService {
    private quizRepository = AppDataSource.getRepository(Quiz);

    async startQuiz(quizId : number) : Promise<Quiz> {
        const quiz = await this.quizRepository.findOne({
            where: {quiz_id : quizId},
            relations : ['mentor']
        });

        if(!quiz) throw new Error("Quiz not found");

        

        if(!quiz.canStart()) throw new Error(`Quiz cannot be started from ${quiz.session_state} state`);

        quiz.session_state = 'active';
        quiz.start_datetime = new Date();

        const savedQuiz = await this.quizRepository.save(quiz);

        socketService.broadcastToQuiz(quizId,'quiz_started', {
            state : 'active',
            quizId,
            started_at : quiz.start_datetime,
            duration : quiz.duration,
        });

        return savedQuiz;
    }

    async pauseQuiz(quizId : number) : Promise<Quiz> {
        const quiz = await this.quizRepository.findOne({
            where : { quiz_id : quizId},
            relations : ['mentor']
        });

        if (!quiz) throw new Error('Quiz not found');
        
        if (!quiz.canPause()) {throw new Error('Quiz cannot be paused')};

        quiz.session_state = 'paused';
        const savedQuiz = await this.quizRepository.save(quiz);

        socketService.broadcastToQuiz(quizId,'quiz_paused', {
            quizId,
            state : 'paused',
            pausedAt: new Date()
        });
        return savedQuiz;

    }

    async resumeQuiz(quizId : number) :Promise<Quiz> {
        const quiz = await this.quizRepository.findOne({
            where : {quiz_id : quizId},
            relations : ['mentor']
        });

        if(!quiz) throw new Error("Quiz not found");
        
        if(!quiz.canResume()) throw new Error("Quiz cannot be resumed");

        quiz.session_state = 'active';
        const savedQuiz = await this.quizRepository.save(quiz);

        socketService.broadcastToQuiz(quizId,'quiz_resumed', {
            state: 'active',
            quizId,
            resumedAt : new Date()
        });
        return savedQuiz;
    }

    async stopQuiz(quizId : number) : Promise<Quiz> {
        const quiz = await this.quizRepository.findOne({
            where : {quiz_id : quizId},
            relations : ['mentor']
        });

        if(!quiz) throw new Error("Quiz not found");
        
        if(!quiz.canStop()) throw new Error("Quiz cannot be stopped");

        quiz.session_state ='ended';
        quiz.end_datetime = new Date();
        const savedQuiz = await this.quizRepository.save(quiz);

        socketService.broadcastToQuiz(quizId,'quiz_ended',{
            state : 'ended',
            quizId,
            endedAt : quiz.end_datetime
        });
        return savedQuiz;
    }

    async getQuizState(quizId : number) : Promise<Quiz>{
        const quiz = await this.quizRepository.findOne({
            where: {quiz_id : quizId},
            relations : ['mentor']
        });
        if(!quiz) throw new Error("Quiz not found");

        return quiz;
    }
  
}