import { Server } from "socket.io";
import { QuizSessionService } from "./quizSessionService";
import { User } from "../entities/User";
import AppDataSource from "../db/dataSource";
import { QuizAttempt } from "../entities/QuizAttempt";

export class SocketService {
    private io: Server;
    private quizRooms = new Map<number, Set<string>>();
    private quizTimers = new Map<number, NodeJS.Timeout>();
    private quizMeta = new Map<number, { totalQuestions: number }>();
    private quizRemainingTime = new Map<number, number>();
    private quizStatus = new Map<number, "active" | "paused" | "ended">();
    private quizCurrentQuestion = new Map<number, number>();

    private candidateProgress = new Map<number, Map<number, {
        userId : number;
        attemptId : number;
        socketId: string;
        candidateName: string;
        currentQuestionIndex: number;
        answers: Map<number, string>;
        joinedAt: Date;
        lastActivity: Date;
    }>>();

    constructor(server: any) {
        this.io = new Server(server, {
            cors: {
                origin: ["http://localhost:5173", "http://localhost:3000"],
                methods: ["GET", "POST"],
                credentials: true,
            },
            connectionStateRecovery: {
                maxDisconnectionDuration: 2 * 60 * 1000,
                skipMiddlewares: true,
            },
        });

        this.socketHandlers();
    }

    broadcastToQuiz(quizId: number, event: string, payload: object) {
        this.io.to(`candidate_${quizId}`).emit(event, payload);
        this.io.to(`mentor_${quizId}`).emit(event, payload);
    }

     private  socketHandlers() {
        this.io.on("connection", (socket) => {
            console.log(`Client connected: ${socket.id}`);
            console.log(`Total clients: ${this.io.engine.clientsCount}`);

            // Mentor joins quiz room
            socket.on("mentor_joined", ({ quizId }: { quizId: number }) => {
                socket.join(`mentor_${quizId}`);
                console.log(`Mentor ${socket.id} joined mentor_${quizId}`);
            });

            // Candidate joins quiz room
             socket.on("join_quiz", async ({ 
                quizId,
                attemptId,          
            }: { quizId: number, attemptId : number}) => {
                if (!quizId) {
                    console.log("Quiz Id not found");
                    return;
                }

                const attemptRepo = AppDataSource.getRepository(QuizAttempt);

                const attempt = await  attemptRepo.findOne({where : {attempt_id:attemptId},
                relations : ["candidate","candidate.user"]});

                if(!attempt) throw new Error("Attempt not found");

                const candidateName = attempt.candidate.full_name;
                const userId = attempt.candidate.user.user_id ;
                
                
                if (!this.candidateProgress.has(quizId)) {
                    this.candidateProgress.set(quizId, new Map());
                }

                this.candidateProgress.get(quizId)!.set(attemptId, {
                    userId,
                    attemptId,
                    socketId : socket.id,
                    candidateName,
                    currentQuestionIndex : 0,
                    answers: new Map(),
                    joinedAt : new Date(),
                    lastActivity : new Date(),
                });

                socket.join(`candidate_${quizId}`);
                // Acknowledge back to candidate with remaining time and leaderboard
                socket.emit("join_quiz_ack", {
                    remainingTime: this.getRemainingTime(quizId),
                    leaderBoard: this.getLeaderBoard(quizId),

                });

                // Notify mentor
                this.io.to(`mentor_${quizId}`).emit("candidate_joined", {
                    candidateId: socket.id,
                    candidateName: candidateName || `Candidate_${attemptId}`,
                    joinedAt: new Date(),
                    quizId,
                });

                console.log(`Candidate ${attemptId} joined quiz ${quizId}`);
            });

            // Candidate navigates a question
            socket.on("candidate_navigated", ({ quizId,attemptId, questionNo }: { quizId: number,attemptId : number, questionNo: number }) => {
                const candidate = this.candidateProgress.get(quizId)?.get(attemptId);
                if (!candidate) {
                    console.log("No candidate");
                    return;
                }

                candidate.currentQuestionIndex = questionNo;
                this.quizCurrentQuestion.set(quizId, questionNo)
                candidate.lastActivity = new Date();

                // Notify mentor of candidate progress
                this.io.to(`mentor_${quizId}`).emit("candidate_progress", {
                    candidateId: attemptId,
                    candidateName: candidate.candidateName,
                    currentQuestionIndex: questionNo,
                    lastActivity: candidate.lastActivity,
                });

                console.log(`Candidate ${attemptId} navigated to question ${questionNo + 1}`);
            });

            // Candidate saves answer
            socket.on("answer_saved", ({ quizId,attemptId, questionId, answer }: { quizId: number,attemptId: number, questionId: number, answer: string }) => {
                const candidate = this.candidateProgress.get(quizId)?.get(attemptId);
                if (!candidate) return;

                candidate.answers.set(questionId, answer);
                candidate.lastActivity = new Date();

                // Notify mentor
                this.io.to(`mentor_${quizId}`).emit("candidate_answer_saved", {
                    candidateId: attemptId,
                    candidateName: candidate.candidateName,
                    questionId,
                    answeredAt: candidate.lastActivity,
                });

                console.log(`Candidate ${attemptId} answered question ${questionId}`);
            });

            // Candidate submits quiz
            socket.on("candidate_submitted", ({ quizId, attemptId }: { quizId: number, attemptId : number }) => {
                this.processCandidateSubmission(attemptId, quizId);

                // Confirm submission to candidate
                socket.emit("submission_confirmed", { quizId });

                // Notify mentor
                this.io.to(`mentor_${quizId}`).emit("candidate_submitted", {
                    candidateId: attemptId,
                    quizId,
                    submittedAt: new Date(),
                });

                console.log(`Candidate ${attemptId} submitted quiz ${quizId}`);
            });

            // Mentor starts the quiz
            socket.on("start_quiz", ({ quizId, questions, duration }: { quizId: number, questions: any[], duration: number }) => {
                socket.join(`mentor_${quizId}`);
                socket.join(`candidate_${quizId}`);
                this.startQuizForCandidates(quizId, questions, duration);
            });

            socket.on("pause_quiz", ({ quizId }: { quizId: number }) => {
                socket.join(`mentor_${quizId}`);
                this.pauseQuizForCandidates(quizId);
            });

            socket.on("resume_quiz", ({ quizId }: { quizId: number }) => {
                socket.join(`mentor_${quizId}`);
                this.resumeQuizForCandidates(quizId);
            });

            socket.on("end_quiz", ({ quizId }: { quizId: number }) => {
                socket.join(`mentor_${quizId}`);
                this.endQuizForCandidates(quizId);
            });

            // Disconnect and cleanup
            socket.on("disconnect", () => {
                for(const[quizId,quizMap] of this.candidateProgress){
                    for(const c of quizMap.values()){
                        if(c.socketId === socket.id){
                            c.socketId = ""
                        }
                    }
                }
            });
        });
    }

    // cleanupSocketFromQuiz(socketId: string, quizId: number) {
    //     this.candidateProgress.get(quizId)?.delete(attemptId);
    //     const socket = this.io.sockets.sockets.get(attemptId);
    //     if (socket) {
    //         socket.leave(`quiz_${quizId}`);
    //         socket.leave(`mentor_${quizId}`);
    //         socket.leave(`candidate_${quizId}`);
    //     }

    //     console.log(`Client ${attemptId} left quiz ${quizId}`);
    // }

    startQuizForCandidates(quizId: number, questions: any[], duration: number) {
        if (!questions?.length) questions = [];

        this.quizMeta.set(quizId, { totalQuestions: questions.length });
        this.quizCurrentQuestion.set(quizId, 0);


        const payload = {
            state: "active",
            quizId,
            duration,
            questions: questions,
            //  questions.map((q, i) => ({
            //     question_id: q.question_id,
            //     question_text: q.question_text,
            //     question_number: i + 1,
            //     total_questions: questions.length,
            // })),
            startedAt: new Date(),
        };

        this.broadcastToQuiz(quizId,"quiz_started",payload);

        // this.io.to(`mentor_${quizId}`).emit("quiz_started", payloadMentor);
        this.quizRemainingTime.set(quizId, duration);
        this.quizStatus.set(quizId, "active");
        this.startQuizTimer(quizId);

        console.log(`Quiz ${quizId} started`);
    }

    startQuizTimer(quizId: number) {

        const existing = this.quizTimers.get(quizId);
        if (existing) {
            clearInterval(existing);
            this.quizTimers.delete(quizId);
        }

        const timer = setInterval(() => {

            if (this.quizStatus.get(quizId) !== "active") {
                clearInterval(timer);
                this.quizTimers.delete(quizId);
                return;
            }

            const remaining = this.quizRemainingTime.get(quizId)!;
            if (remaining === undefined) return;

            const updated = remaining - 1;
            if (updated <= 0) {
                this.quizRemainingTime.set(quizId, 0);
                this.endQuizForCandidates(quizId, "time_up");
            }

            this.quizRemainingTime.set(quizId, updated);


            this.broadcastToQuiz(quizId, "time_update", {
                quizId, remainingTime: updated,
                currentQuestionIndex: this.quizCurrentQuestion.get(quizId)
            });

        }, 1000);

        this.quizTimers.set(quizId, timer);
    }

    pauseQuizForCandidates(quizId: number) {

        const timer = this.quizTimers.get(quizId);
        if (timer) {
            clearInterval(timer);
            console.log(timer);
            this.quizTimers.delete(quizId);
        }
        this.quizStatus.set(quizId, "paused");

        this.broadcastToQuiz(quizId, "quiz_paused", {
            state: "paused",
            quizId,
            remainingTime: this.quizRemainingTime.get(quizId),
            currentQuestionIndex: this.quizCurrentQuestion.get(quizId),
        });

        console.log(`Quiz ${quizId} paused`);
    }

    resumeQuizForCandidates(quizId: number) {

        if (this.quizStatus.get(quizId) !== "paused") return;

        // If there was a previous timer, restart it
        const remaining = this.quizRemainingTime.get(quizId);  // Get the time remaining when paused

        if (remaining === undefined || remaining <= 0) return;

        this.quizStatus.set(quizId, "active");

        this.startQuizTimer(quizId);

        // Notify candidates and mentor that the quiz is resumed
        this.broadcastToQuiz(quizId, "quiz_resumed", {
            state: "active",
            quizId,
            remainingTime: remaining
        });

        console.log(`Quiz ${quizId} resumed`);
    }


    endQuizForCandidates(quizId: number, reason = "mentor_stopped") {
        const timer = this.quizTimers.get(quizId);

        if (timer) {
            clearInterval(timer);
            this.quizTimers.delete(quizId);
        }

        this.broadcastToQuiz(quizId, "quiz_ended", {
            state: "ended",
            quizId,
            reason,
            endedAt: new Date().toISOString()
        });


        this.quizStatus.set(quizId, "ended");
        this.quizTimers.delete(quizId);
        this.quizRemainingTime.delete(quizId);
        this.quizCurrentQuestion.delete(quizId);



        // Process remaining candidates
        this.candidateProgress.get(quizId)?.forEach((_, attemptId) => this.processCandidateSubmission(attemptId, quizId));

        this.candidateProgress.delete(quizId);
        this.io.in(`candidate_${quizId}`).socketsLeave(`candidate_${quizId}`);
        this.io.in(`mentor_${quizId}`).socketsLeave(`mentor_${quizId}`);
        this.io.in(`quiz_${quizId}`).socketsLeave(`quiz_${quizId}`);


        console.log(`Quiz ${quizId} ended`);
    }


    async processCandidateSubmission(attemptId : number, quizId: number) {
        const candidate = this.candidateProgress.get(quizId)?.get(attemptId);

        if (!candidate) return;

        console.log(`Processing submission for ${attemptId}:`, Object.fromEntries(candidate.answers.entries()));

        const quizSessionService = new QuizSessionService();

        try {
            await quizSessionService.saveCandidateSubmission(
                quizId,
                attemptId,
                candidate.candidateName,
                Object.fromEntries(candidate.answers.entries())
            );
        } catch (err) {
            console.error(err);
            // Notify candidate and mentor about submission failure
            this.io.to(`candidate_${quizId}`).emit("submission_failed", {
                quizId,
                message: "There was an issue submitting your answers. Please try again later."
            });
        } finally {
            this.candidateProgress.get(quizId)?.delete(attemptId);
        }
    }

    getRemainingTime(quizId: number) {

        return this.quizRemainingTime.get(quizId);
    }

    getLeaderBoard(quizId: number) {
        const candidates = Array.from(this.candidateProgress.get(quizId)?.values() || []);
        const leaderboard = candidates.map(candidate => {
            return {
                candidateName: candidate.candidateName,
                score: this.calculateScore(candidate.answers),
            };
        });

        leaderboard.sort((a, b) => b.score - a.score); // Sort by score in descending order
        return leaderboard;
    }

    calculateScore(answers: Map<number, string>) {
        return answers.size;
    }
}
