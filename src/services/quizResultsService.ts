import AppDataSource from "../db/dataSource";
import { Quiz } from "../entities/Quiz";
import { QuizAttempt } from "../entities/QuizAttempt";
import { QuizAnswer } from "../entities/QuizAnswer";
import { Questions } from "../entities/Questions";
import { Options } from "../entities/Options";

export class QuizResultsService {
    private quizRepository = AppDataSource.getRepository(Quiz);
    private attemptRepository = AppDataSource.getRepository(QuizAttempt);
    private answerRepository = AppDataSource.getRepository(QuizAnswer);
    private questionRepository = AppDataSource.getRepository(Questions);
    private optionRepository = AppDataSource.getRepository(Options);

    async getQuizResultsSummary(quizId: number) {
        try {
            console.log(`📊 Fetching results summary for quiz ${quizId}`);

            // Get quiz details
            const quiz = await this.quizRepository.findOne({
                where: { quiz_id: quizId },
                relations: ['questions', 'questions.options']
            });

            if (!quiz) {
                throw new Error('Quiz not found');
            }

            // Get all attempts for this quiz
            const attempts = await this.attemptRepository.find({
                where: { quiz: { quiz_id: quizId } },
                relations: ['candidate']
            });

            // Calculate statistics
            const totalAttempts = attempts.length;
            const averageScore = totalAttempts > 0 
                ? attempts.reduce((sum, attempt) => sum + (attempt.percentage || 0), 0) / totalAttempts
                : 0;

            const highestScore = totalAttempts > 0 
                ? Math.max(...attempts.map(attempt => attempt.percentage || 0))
                : 0;

            const lowestScore = totalAttempts > 0 
                ? Math.min(...attempts.map(attempt => attempt.percentage || 0))
                : 0;

            // Score distribution
            const scoreRanges = {
                excellent: attempts.filter(a => (a.percentage || 0) >= 80).length,
                good: attempts.filter(a => (a.percentage || 0) >= 60 && (a.percentage || 0) < 80).length,
                fair: attempts.filter(a => (a.percentage || 0) >= 40 && (a.percentage || 0) < 60).length,
                poor: attempts.filter(a => (a.percentage || 0) < 40).length
            };

            // Time taken analysis
            const timeAnalysis = this.calculateTimeAnalysis(attempts, quiz);

            return {
                quiz: {
                    quiz_id: quiz.quiz_id,
                    quiz_name: quiz.quiz_name,
                    total_questions: quiz.questions?.length || 0,
                    duration: quiz.duration,
                    status: quiz.status
                },
                statistics: {
                    total_attempts: totalAttempts,
                    average_score: Math.round(averageScore * 100) / 100,
                    highest_score: highestScore,
                    lowest_score: lowestScore,
                    score_ranges: scoreRanges
                },
                time_analysis: timeAnalysis,
                quiz_completed: quiz.session_state === 'ended'
            };

        } catch (error) {
            console.error('Error in getQuizResultsSummary:', error);
            throw error;
        }
    }

    async getDetailedQuizResults(quizId: number) {
        try {
            console.log(`📈 Fetching detailed results for quiz ${quizId}`);

            // Get quiz with all details
            const quiz = await this.quizRepository.findOne({
                where: { quiz_id: quizId },
                relations: ['questions', 'questions.options']
            });

            if (!quiz) {
                throw new Error('Quiz not found');
            }

            

            // Get all attempts with answers
            const attempts = await this.attemptRepository.find({
                where: { quiz: { quiz_id: quizId } },
                relations: ['candidate', 'answers', 'answers.question', 'answers.selected_option'],
                order: { submitted_at: 'DESC' }
            });

            // Format detailed results
            const detailedResults = attempts.map(attempt => ({
                attempt_id: attempt.attempt_id,
                candidate_name: attempt.candidate?.candidate_id || 'Anonymous',
                score: attempt.score,
                total_questions: attempt.total_questions,
                percentage: attempt.percentage,
                submitted_at: attempt.submitted_at,
                time_taken: this.calculateTimeTaken(attempt.submitted_at, quiz.start_datetime),
                answers: attempt.answers?.map(answer => ({
                    question_id: answer.question?.question_id,
                    question_text: answer.question?.question_text,
                    selected_answer: answer.user_answer_text,
                    correct_answer: answer.selected_option?.option_text,
                    is_correct: answer.is_correct
                })) || []
            }));

            return {
                quiz_info: {
                    quiz_id: quiz.quiz_id,
                    quiz_name: quiz.quiz_name,
                    total_questions: quiz.questions?.length || 0
                },
                attempts: detailedResults,
                summary: {
                    total_attempts: attempts.length,
                    completed_attempts: attempts.filter(a => a.answers && a.answers.length > 0).length
                }
            };

        } catch (error) {
            console.error('Error in getDetailedQuizResults:', error);
            throw error;
        }
    }

    async getQuestionAnalytics(quizId: number) {
        try {
            console.log(`📊 Fetching question analytics for quiz ${quizId}`);

            // Get quiz with questions
            const quiz = await this.quizRepository.findOne({
                where: { quiz_id: quizId },
                relations: ['questions', 'questions.options']
            });

            if (!quiz) {
                throw new Error('Quiz not found');
            }

            // Get all answers for this quiz
            const answers = await this.answerRepository.find({
                where: { 
                    attempt: { quiz: { quiz_id: quizId } }
                },
                relations: ['question', 'selected_option', 'question.options']
            });

            // Analyze each question
            const questionAnalytics = quiz.questions?.map(question => {
                const questionAnswers = answers.filter(answer => answer.question?.question_id === question.question_id);
                const totalAnswers = questionAnswers.length;
                
                if (totalAnswers === 0) {
                    return {
                        question_id: question.question_id,
                        question_text: question.question_text,
                        total_answers: 0,
                        correct_answers: 0,
                        accuracy_rate: 0,
                        option_analysis: []
                    };
                }

                const correctAnswers = questionAnswers.filter(answer => answer.is_correct).length;
                const accuracyRate = (correctAnswers / totalAnswers) * 100;

                // Analyze each option
                const optionAnalysis = question.options?.map(option => {
                    const selectedCount = questionAnswers.filter(answer => 
                        answer.selected_option?.option_id === option.option_id
                    ).length;
                    
                    return {
                        option_id: option.option_id,
                        option_text: option.option_text,
                        is_correct: option.correct_option,
                        selected_count: selectedCount,
                        selection_rate: totalAnswers > 0 ? (selectedCount / totalAnswers) * 100 : 0
                    };
                }) || [];

                return {
                    question_id: question.question_id,
                    question_text: question.question_text,
                    total_answers: totalAnswers,
                    correct_answers: correctAnswers,
                    accuracy_rate: Math.round(accuracyRate * 100) / 100,
                    option_analysis: optionAnalysis
                };
            }) || [];

            return {
                quiz_id: quizId,
                quiz_name: quiz.quiz_name,
                question_analytics: questionAnalytics,
                overall_stats: {
                    total_questions: quiz.questions?.length || 0,
                    total_responses: answers.length,
                    average_accuracy: questionAnalytics.length > 0 
                        ? questionAnalytics.reduce((sum, q) => sum + q.accuracy_rate, 0) / questionAnalytics.length
                        : 0
                }
            };

        } catch (error) {
            console.error('Error in getQuestionAnalytics:', error);
            throw error;
        }
    }

    private calculateTimeAnalysis(attempts: QuizAttempt[], quiz: Quiz) {
        if (!quiz.start_datetime) return null;

        const startTime = new Date(quiz.start_datetime).getTime();
        const durations = attempts.map(attempt => {
            const attemptTime = new Date(attempt.submitted_at).getTime();
            return (attemptTime - startTime) / (1000 * 60); // Convert to minutes
        });

        if (durations.length === 0) return null;

        return {
            average_time_minutes: Math.round((durations.reduce((sum, d) => sum + d, 0) / durations.length) * 100) / 100,
            fastest_time_minutes: Math.round(Math.min(...durations) * 100) / 100,
            slowest_time_minutes: Math.round(Math.max(...durations) * 100) / 100
        };
    }

    private calculateTimeTaken(submittedAt: Date, startedAt?: Date): number {
        if (!startedAt) return 0;
        
        const start = new Date(startedAt).getTime();
        const end = new Date(submittedAt).getTime();
        return Math.round((end - start) / (1000 * 60)); // Return in minutes
    }
}