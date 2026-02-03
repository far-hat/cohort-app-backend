import AppDataSource from "../db/dataSource";
import { Quiz } from "../entities/Quiz";
import { QuizAttempt } from "../entities/QuizAttempt";
import { User } from "../entities/User";
import { redis } from "../redis/redisClient";
import { SocketService } from "./socketService";

export class QuizSessionService {
    private quizTimers = new Map<number, NodeJS.Timeout>();
    constructor(private socketService: SocketService) { }

    async startQuiz(quiz: Quiz) {

         //  Validate quiz can be started
        if (!quiz.canStart()) {
            throw new Error(`Quiz cannot be started from ${quiz.session_state} state`);
        }

        const now = new Date();
        const durationMs = quiz.duration * 60 *1000;

        // Update DB
        quiz.status = "active";
        quiz.session_state = 'active';
        quiz.start_datetime = now;
        quiz.end_datetime = new Date(now.getTime() + durationMs);
        quiz.paused_at = null;
        quiz.total_paused_ms = 0;

        await AppDataSource.getRepository(Quiz).save(quiz);

        this.startStopTimer(quiz, durationMs);

        // 5. Prepare questions for Redis
        const questionsPayload = quiz.questions?.map((q, i) => ({
            question_id: q.question_id,
            question_text: q.question_text,
            options: q.options?.map(o => ({
                option_id: o.option_id,
                option_text: o.option_text
            })) || [],
            question_number: i + 1,
            total_questions: quiz.questions?.length || 0
        })) || [];

        await this.socketService.emitToQuiz(quiz.quiz_id, "quiz_started", {
            quizId : quiz.quiz_id,
            state : "active",
            questions : questionsPayload,
            crrentQuestionIndex : 0,
            duration : quiz.duration,
            startedAt: quiz.start_datetime,
        });

        return quiz;

    }

    async pauseQuiz(quiz: Quiz) {
        if(!quiz.canPause()){
            throw new Error("Quiz cannot be paused");
        }

        await this.clearStopTimer(quiz.quiz_id);

        // 2. Update DB

        quiz.session_state = 'paused';
        quiz.paused_at = new Date();

        await AppDataSource.getRepository(Quiz).save(quiz);

        // 3. Emit event
        await this.socketService.emitToQuiz(quiz.quiz_id, "quiz_paused", {
            state: "paused",
            quizId : quiz.quiz_id,
            pausedAt: quiz.paused_at,
        });

        return quiz;
    }

    async resumeQuiz(quiz : Quiz) {

        if(!quiz.canResume()) {
            throw new Error("Quiz cannot be resumed");
        }
        
        const now = Date.now();
        const pausedAt = quiz.paused_at?.getTime();

        if(pausedAt){
            const pausedDuration = now - pausedAt;
            quiz.total_paused_ms! += now -pausedAt;

            quiz.end_datetime = new Date(quiz.end_datetime!.getTime() + pausedDuration)
        }

        quiz.paused_at = null;
        quiz.status = "active";
        quiz.session_state = 'active';

        await AppDataSource.getRepository(Quiz).save(quiz);

        const remainingMs = this.computeRemainingMs(quiz);
        this.startStopTimer(quiz, remainingMs);

        //  Emit event
        await this.socketService.emitToQuiz(quiz.quiz_id, "quiz_resumed", {
            state: "active",
            quizId :quiz.quiz_id,
            resumedAt: new Date()
        });

        return quiz;
    }

    async stopQuiz(quiz : Quiz, reason: string = "mentor_stopped") {

        if (!quiz.canStop()) {
            throw new Error("Quiz cannot be stopped");
        }

        this.clearStopTimer(quiz.quiz_id);

        // Update DB 
        //quiz.status = "draft";
        quiz.session_state = 'ended';
        quiz.end_datetime = new Date();

        await AppDataSource.getRepository(Quiz).save(quiz);

        // 3. Emit event
        await this.socketService.emitToQuiz(quiz.quiz_id, "quiz_ended", {
            state: "ended",
            quizId : quiz.quiz_id,
            reason,
            endedAt: quiz.end_datetime
        });

        // 4. Process submissions and cleanup 
        this.processQuizEnd(quiz.quiz_id);

        return quiz;
    }

    // state computation

    async getQuizState(quiz : Quiz) {
        const now = Date.now();

        const startTime = quiz.start_datetime.getTime();
        const durationMs = (quiz.duration || 0) * 60 * 1000;
        const pausedMs = quiz.total_paused_ms ?? 0;
        const pausedAt = quiz.paused_at?.getTime() ?? null;

        let elapsedMs = 0;

        if(startTime) {
            elapsedMs = now - startTime - pausedMs;
            if(pausedAt){
                elapsedMs -= now - pausedAt;
            }
        }

        const remainingMs = Math.max(0, durationMs - elapsedMs);

        let session_state = quiz.session_state;
        if(quiz.session_state === "active" && remainingMs === 0){
            session_state = "ended";
        }

        const totalQuestions = quiz.questions?.length ?? 0;

        const progressRatio = durationMs > 0 ? (durationMs - remainingMs) / durationMs : 0;

        const currentQuestionIndex = session_state === "active" && totalQuestions > 0 ? Math.min(totalQuestions -1, Math.floor(progressRatio * totalQuestions)) : 0;

        console.log( session_state,
            quiz.quiz_id,
            currentQuestionIndex,
        quiz.duration);

        

        // 2. Return combined state
        return {
            session_state,
            quiz_id: quiz.quiz_id,
            remainingTime : Math.ceil(remainingMs / 1000),
            currentQuestionIndex,
            questions : quiz.questions.map( (q,i) => ({
                question_id : q.question_id,
                question_text : q.question_text,
                options : q.options.map( o => ({
                    option_id : o.option_id,
                    option_text : o.option_text
                })) || [],
                question_number : i + 1,
                total_questions : totalQuestions
            })) || [],
            duration: quiz?.duration,
            start_datetime: quiz?.start_datetime,
            end_datetime: quiz?.end_datetime
        };
    }

    //              ATTEMPTS
    async createAttempt(user : User, quiz : Quiz) {
        

        if (!user?.candidate) {
            throw new Error("Candidate not found");
        }

        

        const attemptRepo = AppDataSource.getRepository(QuizAttempt);
        const attempt = attemptRepo.create({
            candidate: user.candidate,
            quiz: quiz,
            total_questions: quiz.questions?.length ?? 0,
        });

        const savedAttempt = await attemptRepo.save(attempt);

        // Store in Redis for quick access
        await redis.hset(`attempt:${savedAttempt.attempt_id}`, {
            userId : user.user_id,
            quizId: quiz.quiz_id.toString(),
            candidateName: user.candidate.full_name,
            createdAt: new Date().toISOString(),
            isTemporary: "false"
        });

        return {
            attemptId: savedAttempt.attempt_id,
            candidateName: user.candidate.full_name,
            quizId : quiz.quiz_id
        };
    }

    //          INTERNAL TIMER
    private startStopTimer(quiz : Quiz, delayMs : number){
        this.clearStopTimer(quiz.quiz_id);

        const timer = setTimeout( async () => {
            try {
                if(quiz.session_state === "active"){
                    await this.stopQuiz(quiz, "time_up");
                }
            } catch (error) {
                console.error("Stop timer error",error);
            }
    },delayMs);
    this.quizTimers.set(quiz.quiz_id, timer);
    }

    private clearStopTimer(quizId : number){
        const timer = this.quizTimers.get(quizId);
        if(timer){
            clearTimeout(timer);
            this.quizTimers.delete(quizId);
        }
    }

    private async processQuizEnd(quizId: number) {
        // Async cleanup - don't wait for this
        setTimeout(async () => {
            try {
                const candidateIds = await redis.smembers(`quiz:${quizId}:candidates`);
                for (const candidateId of candidateIds) {
                    const candidateData = await redis.hgetall(`candidate:${candidateId}`);
                    if (candidateData.userId) {
                        // Process submission logic here
                        console.log(`Processing submission for candidate ${candidateId}`);
                    }
                }

                // Cleanup Redis after delay
                setTimeout(async () => {
                    await redis.del(`quiz:${quizId}:remaining`);
                    await redis.del(`quiz:${quizId}:status`);
                    await redis.del(`quiz:${quizId}:currentQuestion`);
                    await redis.del(`quiz:${quizId}:questions`);
                    await redis.del(`quiz:${quizId}:timer`);
                }, 300000); // 5 minutes
            } catch (error) {
                console.error("Quiz end processing error:", error);
            }
        }, 1000);
    }

    private computeRemainingMs(quiz: Quiz): number {
        const now = Date.now();
        const startTime = quiz.start_datetime?.getTime() ?? null;
        const durationMs = quiz.duration * 60 * 1000;
        const pausedMs = quiz.total_paused_ms ?? 0;
        const pausedAt = quiz.paused_at?.getTime() ?? null;

        if (!startTime) return durationMs;

        let elapsedMs = now - startTime - pausedMs;
        if (pausedAt) {
            elapsedMs -= now - pausedAt;
        }

        return Math.max(0, durationMs - elapsedMs);
    }

}