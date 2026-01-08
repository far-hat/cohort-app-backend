import { Server } from "socket.io";
import { QuizSessionService } from "./quizSessionService";

export class SocketService {
    private io: Server;
    private quizRooms = new Map<number, Set<string>>();
    private quizTimers = new Map<number, NodeJS.Timeout>();
    private quizMeta = new Map<number, { totalQuestions: number }>();
    private quizRemainingTime = new Map<number, number>();
    private quizStatus = new Map<number, "active" | "paused" | "ended">();
    private quizCurrentQuestion = new Map<number,number>();

    private candidateProgress = new Map<number, Map<string, {
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

    private socketHandlers() {
        this.io.on("connection", (socket) => {
            console.log(`Client connected: ${socket.id}`);
            console.log(`Total clients: ${this.io.engine.clientsCount}`);

            // Mentor joins quiz room
            socket.on("mentor_joined", ({ quizId }: { quizId: number }) => {
                socket.join(`mentor_${quizId}`);
                console.log(`Mentor ${socket.id} joined mentor_${quizId}`);
            });

            // Candidate joins quiz room
            socket.on("join_quiz", ({ quizId, candidateName }: { quizId: number, candidateName?: string }) => {
                if (!quizId) {
                    console.log("Quiz Id not found");
                    return;
                }

                socket.join(`candidate_${quizId}`);
                socket.join(`quiz_${quizId}`); // optional for room broadcasts

                if (!this.candidateProgress.has(quizId)) {
                    this.candidateProgress.set(quizId, new Map());
                }

                
                this.candidateProgress.get(quizId)!.set(socket.id, {
                    socketId: socket.id,
                    candidateName: candidateName || `Candidate_${socket.id.slice(0, 6)}`,
                    currentQuestionIndex: 0,
                    answers: new Map(),
                    joinedAt: new Date(),
                    lastActivity: new Date(),
                });

                // Acknowledge back to candidate with remaining time and leaderboard
                socket.emit("join_quiz_ack", {
                    remainingTime: this.getRemainingTime(quizId),
                    leaderBoard: this.getLeaderBoard(quizId),

                });

                // Notify mentor
                this.io.to(`mentor_${quizId}`).emit("candidate_joined", {
                    candidateId: socket.id,
                    candidateName: candidateName || `Candidate_${socket.id.slice(0, 6)}`,
                    joinedAt: new Date(),
                    quizId,
                });

                console.log(`Candidate ${socket.id} joined quiz ${quizId}`);
            });

            // Candidate navigates a question
            socket.on("candidate_navigated", ({ quizId, questionNo }: { quizId: number, questionNo: number }) => {
                const candidate = this.candidateProgress.get(quizId)?.get(socket.id);
                if (!candidate) {
                    console.log("No candidate");
                    return;
                }

                candidate.currentQuestionIndex = questionNo;
                this.quizCurrentQuestion.set(quizId,questionNo)
                candidate.lastActivity = new Date();

                // Notify mentor of candidate progress
                this.io.to(`mentor_${quizId}`).emit("candidate_progress", {
                    candidateId: socket.id,
                    candidateName: candidate.candidateName,
                    currentQuestionIndex: questionNo,
                    lastActivity: candidate.lastActivity,
                });

                console.log(`Candidate ${socket.id} navigated to question ${questionNo + 1}`);
            });

            // Candidate saves answer
            socket.on("answer_saved", ({ quizId, questionId, answer }: { quizId: number, questionId: number, answer: string }) => {
                const candidate = this.candidateProgress.get(quizId)?.get(socket.id);
                if (!candidate) return;

                candidate.answers.set(questionId, answer);
                candidate.lastActivity = new Date();

                // Notify mentor
                this.io.to(`mentor_${quizId}`).emit("candidate_answer_saved", {
                    candidateId: socket.id,
                    candidateName: candidate.candidateName,
                    questionId,
                    answeredAt: candidate.lastActivity,
                });

                console.log(`Candidate ${socket.id} answered question ${questionId}`);
            });

            // Candidate submits quiz
            socket.on("candidate_submitted", ({ quizId }: { quizId: number }) => {
                this.processCandidateSubmission(socket.id, quizId);

                // Confirm submission to candidate
                socket.emit("submission_confirmed", { quizId });

                // Notify mentor
                this.io.to(`mentor_${quizId}`).emit("candidate_submitted", {
                    candidateId: socket.id,
                    quizId,
                    submittedAt: new Date(),
                });

                console.log(`Candidate ${socket.id} submitted quiz ${quizId}`);
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
                console.log(`Client disconnected: ${socket.id}`);
                this.quizRooms.forEach((_, quizId) => this.cleanupSocketFromQuiz(socket.id, quizId));
            });
        });
    }

    cleanupSocketFromQuiz(socketId: string, quizId: number) {
        this.candidateProgress.get(quizId)?.delete(socketId);
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
            socket.leave(`quiz_${quizId}`);
            socket.leave(`mentor_${quizId}`);
            socket.leave(`candidate_${quizId}`);
        }

        console.log(`Client ${socketId} left quiz ${quizId}`);
    }

    startQuizForCandidates(quizId: number, questions: any[], duration: number) {
        if (!questions?.length) questions = [];

        this.quizMeta.set(quizId, { totalQuestions: questions.length });
        this.quizCurrentQuestion.set(quizId,0);

        this.io.to(`candidate_${quizId}`).emit("quiz_started", {
            state: "active",
            quizId,
            duration,
            questions,
            startedAt: new Date()
        });


        const payloadMentor = {
            state: "active",
            quizId,
            duration,
            questions: questions.map((q, i) => ({
                question_id: q.question_id,
                question_text: q.question_text,
                question_number: i + 1,
                total_questions: questions.length
            })),
            startedAt: new Date(),
        };

        this.io.to(`mentor_${quizId}`).emit("quiz_started", payloadMentor);
        this.quizRemainingTime.set(quizId, duration);
        this.quizStatus.set(quizId, "active");
        this.startQuizTimer(quizId, duration);

        console.log(`Quiz ${quizId} started`);
    }

    startQuizTimer(quizId: number, duration: number) {
        if (this.quizTimers.has(quizId)) clearInterval(this.quizTimers.get(quizId)!);

        const timer = setInterval(() => {
            if(this.quizStatus.get(quizId) !== "active" ) return;
        let remaining = this.quizRemainingTime.get(quizId)! -1;
            this.quizRemainingTime.set(quizId, remaining);

            // this.io.to(`candidate_${quizId}`).emit("time_update", {

            //     state: "active",
            //     quizId,
            //     remainingTime: remaining,
            // });

            this.broadcastToQuiz(quizId,"time_update",{ quizId, remainingTime: remaining });


            if (remaining <= 0) {
                // clearInterval(timer);
                // this.quizTimers.delete(quizId);
                this.endQuizForCandidates(quizId);
            }
        }, 1000);

        this.quizTimers.set(quizId, timer);
    }

    pauseQuizForCandidates(quizId: number) {
        const timer = this.quizTimers.get(quizId);
        if (timer) {
            clearInterval(timer);
            this.quizTimers.delete(quizId);
        }

        const remaining = this.quizRemainingTime.get(quizId);

        // Notify candidates and mentor that the quiz is paused
        // this.io.to(`quiz_${quizId}`).emit("quiz_paused", { 
        //     state : "paused",
        //     quizId,
        //     remainingTime : remaining
        // });

        this.broadcastToQuiz(quizId, "quiz_paused", {
            state: "paused",
            quizId,
            remainingTime: this.quizRemainingTime.get(quizId),
            currentQuestionIndex : this.quizCurrentQuestion.get(quizId),
        });


        this.quizStatus.set(quizId, "paused");

        console.log(`Quiz ${quizId} paused`);
    }

    resumeQuizForCandidates(quizId: number) {
        if (this.quizTimers.has(quizId)) return;
        if (this.quizStatus.get(quizId) !== "paused") return;

        // If there was a previous timer, restart it
        let remaining = this.quizRemainingTime.get(quizId) ?? 0;  // Get the time remaining when paused

        if (remaining <= 0) return;

        this.quizStatus.set(quizId, "active");

        const timer = setInterval(() => {
            if (this.quizStatus.get(quizId) !== "active") return;

            remaining--;
            this.quizRemainingTime.set(quizId, remaining);
            // this.io.to(`quiz_${quizId}`).emit("time_update",{
            //     quizId,
            //     remainingTime : remaining
            // });
            this.broadcastToQuiz(quizId, "time_update", {
                quizId,
                remainingTime: remaining,
                currentQuestionIndex : this.quizCurrentQuestion.get(quizId),
            });

            if (remaining <= 0) {
                this.endQuizForCandidates(quizId, "time_up")
            }
        }, 1000);

        this.quizTimers.set(quizId, timer);

        // Notify candidates and mentor that the quiz is resumed
        this.io.to(`quiz_${quizId}`).emit("quiz_resumed", {
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

        this.quizRemainingTime.delete(quizId);
        this.quizCurrentQuestion.delete(quizId);

        // this.io.to(`quiz_${quizId}`).emit("quiz_ended", {
        //     state: "ended",
        //     quizId,
        //     reason: reason,
        //     endedAt: new Date().toISOString(),
        // });

        this.broadcastToQuiz(quizId, "quiz_ended", {
            state: "ended",
            quizId,
            reason,
            endedAt: new Date().toISOString()
        });


        this.quizStatus.set(quizId, "ended");

        // Process remaining candidates
        this.candidateProgress.get(quizId)?.forEach((_, socketId) => this.processCandidateSubmission(socketId, quizId));

        console.log(`Quiz ${quizId} ended`);
    }


    async processCandidateSubmission(socketId: string, quizId: number) {
        const candidate = this.candidateProgress.get(quizId)?.get(socketId);

        if (!candidate) return;

        console.log(`Processing submission for ${socketId}:`, Object.fromEntries(candidate.answers.entries()));

        const quizSessionService = new QuizSessionService();

        try {
            await quizSessionService.saveCandidateSubmission(
                quizId,
                socketId,
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
            this.candidateProgress.get(quizId)?.delete(socketId);
        }
    }

    getRemainingTime(quizId: number) {
        
        return  this.quizRemainingTime.get(quizId) ?? 0;
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
