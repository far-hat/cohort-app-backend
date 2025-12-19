import AppDataSource from "../db/dataSource";
import { Quiz } from "../entities/Quiz";
import { QuizAttempt } from "../entities/QuizAttempt";
import { QuizAnswer } from "../entities/QuizAnswer";
import { Questions } from "../entities/Questions";
import { Options } from "../entities/Options";
import { socketService } from "../index";

export class QuizSessionService {
    private quizRepository = AppDataSource.getRepository(Quiz);

    async startQuiz(quizId: number): Promise<Quiz> {
        try {
            console.log(`Checking if Data Source is initialized`);

            if (!AppDataSource.isInitialized) {
                console.log(`Database not initialized`);
                throw new Error(`Database could not be connected`);
            }

            console.log(`🔍 Querying database for quiz ${quizId}...`);

            const quiz = await this.quizRepository.findOne({
                where: { quiz_id: quizId },
                relations: ["questions"]
            });
            if (!quiz) {
                console.log("Quiz not found :", quizId);
                throw new Error("Quiz not found");
            }

            console.log(`Quiz found:`, {
                id: quiz.quiz_id,
                course: quiz.quiz_name,
                currentState: quiz.session_state,
                mentor: quiz.mentor ? `Mentor ID: ${quiz.mentor.mentor_id}` : 'No mentor'
            });

            console.log(`Quiz current state : ${quiz.session_state}`);

            if (!quiz.canStart()) {

                console.log("Quiz cannot be started from state ", quiz.session_state);

                throw new Error(`Quiz cannot be started from ${quiz.session_state} state`);
            }

            

            quiz.session_state = 'active';
            quiz.status = 'Active';
            quiz.start_datetime = new Date();

            const savedQuiz = await this.quizRepository.save(quiz);

            console.log("Quiz saved successfully");


            // //Broadcast to Socket
            // const clientCount = socketService.broadcastToQuiz(quizId, 'quiz_started', {
            //     state: 'active',
            //     quizId,
            //     started_at: quiz.start_datetime,
            //     duration: quiz.duration
            // });

            // console.log(`Broadcast to ${clientCount} clients`);

            socketService.startQuiz(
                quizId,
                quiz.duration! * 60, // Convert minutes to seconds
                quiz.questions // Pass questions array
            );

            return savedQuiz;
        } catch (error) {
            console.error(` Error starting quiz ${quizId}:`, error);
            throw error;
        }

    }

    async pauseQuiz(quizId: number): Promise<Quiz> {
        const quiz = await this.quizRepository.findOne({
            where: { quiz_id: quizId },
            relations: ['questions']
        });

        if (!quiz) throw new Error('Quiz not found');

        if (!quiz.canPause()) { throw new Error('Quiz cannot be paused') };

        quiz.session_state = 'paused';
        const savedQuiz = await this.quizRepository.save(quiz);

        socketService.broadcastToQuiz(quizId, 'quiz_paused', {
            quizId,
            state: 'paused',
            pausedAt: new Date()
        });
        return savedQuiz;

    }

    async resumeQuiz(quizId: number): Promise<Quiz> {
        const quiz = await this.quizRepository.findOne({
            where: { quiz_id: quizId },
            relations: ['mentor']
        });

        if (!quiz) throw new Error("Quiz not found");

        if (!quiz.canResume()) throw new Error("Quiz cannot be resumed");

        quiz.session_state = 'active';
        const savedQuiz = await this.quizRepository.save(quiz);

        socketService.broadcastToQuiz(quizId, 'quiz_resumed', {
            state: 'active',
            quizId,
            resumedAt: new Date()
        });
        return savedQuiz;
    }

    async stopQuiz(quizId: number): Promise<Quiz> {
        const quiz = await this.quizRepository.findOne({
            where: { quiz_id: quizId },
            relations: ['mentor']
        });

        if (!quiz) throw new Error("Quiz not found");

        if (!quiz.canStop()) throw new Error("Quiz cannot be stopped");

        quiz.session_state = 'ended';
        quiz.end_datetime = new Date();
        const savedQuiz = await this.quizRepository.save(quiz);

        socketService.broadcastToQuiz(quizId, 'quiz_ended', {
            state: 'ended',
            quizId,
            endedAt: quiz.end_datetime
        });
        return savedQuiz;
    }

    async getQuizState(quizId: number) {
        const quiz = await this.quizRepository.findOne({
            where: { quiz_id: quizId },
            relations: ['mentor','questions']
        });
        if (!quiz) throw new Error("Quiz not found");

        return {
            success: true,
            data: {
                session_state: quiz.session_state,
                quiz_id: quiz.quiz_id,
                start_datetime: quiz.start_datetime,
                duration: quiz.duration,
                remainingTime: quiz.session_state === 'active' ? this.calculateRemainingTime(quiz) : 0,
                questions: quiz.questions?.map((q, index) => ({
                    question_id: q.question_id,
                    question_text: q.question_text,
                    options: q.options?.map(opt => ({
                        option_id: opt.option_id,
                        option_text: opt.option_text
                    })) || [],
                    question_number: index + 1,
                    total_questions: quiz.questions?.length || 0
                })) || []
            }
        };
    }

    private calculateRemainingTime(quiz: Quiz): number {
        if (!quiz.start_datetime || !quiz.duration) return 0;
        
        const startTime = new Date(quiz.start_datetime).getTime();
        const durationMs = quiz.duration * 60 * 1000; // Convert minutes to milliseconds
        const endTime = startTime + durationMs;
        const now = Date.now();
        
        return Math.max(0, Math.floor((endTime - now) / 1000));
    }

    async saveCandidateSubmission(quizId: number, candidateSocketId: string, candidateName: string, answers: Record<number, string>) {
        try {
            console.log(`💾 Saving submission for candidate ${candidateName} (${candidateSocketId}) in quiz ${quizId}`);
            
            // Get quiz with questions and correct answers
            const quiz = await this.quizRepository.findOne({
                where: { quiz_id: quizId },
                relations: ['questions', 'questions.options']
            });

            if (!quiz) {
                throw new Error('Quiz not found');
            }

            // Create a temporary user record for the candidate (in real app, you'd have proper user management)
            let candidateUser = await AppDataSource.getRepository('User').findOne({
                where: { email: `${candidateSocketId}@temp.local` }
            });

            if (!candidateUser) {
                // Create temporary user
                const User = AppDataSource.getRepository('User').metadata.target as any;
                candidateUser = AppDataSource.getRepository(User).create({
                    email: `${candidateSocketId}@temp.local`,
                    username: candidateName,
                    password_hash: 'temp', // In real app, handle this properly
                    role: 'candidate'
                });
                await AppDataSource.getRepository(User).save(candidateUser);
            }

            // Create quiz attempt
            const QuizAttemptRepo = AppDataSource.getRepository(QuizAttempt);
            const QuizAnswerRepo = AppDataSource.getRepository(QuizAnswer);
            const QuestionsRepo = AppDataSource.getRepository(Questions);
            const OptionsRepo = AppDataSource.getRepository(Options);

            const attempt = QuizAttemptRepo.create({
                user: candidateUser,
                quiz: quiz,
                total_questions: quiz.questions?.length || 0,
                submitted_at: new Date()
            });

            const savedAttempt = await QuizAttemptRepo.save(attempt);
            console.log(`📝 Quiz attempt created: ${savedAttempt.attempt_id}`);

            let correctAnswers = 0;
            const totalQuestions = quiz.questions?.length || 0;

            // Process each answer
            for (const [questionId, answerText] of Object.entries(answers)) {
                const qId = Number(questionId);
                const question = quiz.questions?.find(q => q.question_id === qId);
                
                if (!question) {
                    console.warn(`Question ${qId} not found in quiz`);
                    continue;
                }

                // Find the selected option
                const selectedOption = question.options?.find(opt => opt.option_text === answerText);
                const isCorrect = selectedOption?.correct_option || false;

                if (isCorrect) {
                    correctAnswers++;
                }

                // Save answer record
                const quizAnswer = new QuizAnswer();
                quizAnswer.attempt = savedAttempt;
                quizAnswer.question = question;
                quizAnswer.selected_option = selectedOption || null;
                quizAnswer.user_answer_text = answerText;
                quizAnswer.is_correct = isCorrect;

                await QuizAnswerRepo.save(quizAnswer);
                console.log(`✅ Answer saved for question ${qId}: ${answerText} (${isCorrect ? 'correct' : 'incorrect'})`);
            }

            // Calculate score
            const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
            
            // Update attempt with score
            savedAttempt.score = correctAnswers;
            savedAttempt.percentage = score;
            await QuizAttemptRepo.save(savedAttempt);

            console.log(`🎯 Final score: ${correctAnswers}/${totalQuestions} (${score}%)`);

            return {
                attemptId: savedAttempt.attempt_id,
                score: correctAnswers,
                totalQuestions,
                percentage: score,
                candidateName
            };

        } catch (error) {
            console.error(`❌ Error saving candidate submission:`, error);
            throw error;
        }
    }

}