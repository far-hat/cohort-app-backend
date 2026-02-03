import { Server , Socket} from "socket.io";
import { Server as HttpServer } from "http";

import AppDataSource from "../db/dataSource";
import { User } from "../entities/User";
import { QuizAttempt } from "../entities/QuizAttempt";
import { redis } from "../redis/redisClient";
import { verifyToken } from "../middleware/auth";


export class SocketService {
    private io: Server;

     constructor(server: HttpServer) {
        this.io = new Server(server, {
            cors: {
                origin: ["http://localhost:5173", "http://localhost:3000"],
                credentials: true,
                methods: ["GET", "POST"]
            },
            connectionStateRecovery: {
                maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
                skipMiddlewares: true,
            },
            transports: ["websocket", "polling"], // Add this for better compatibility
            pingTimeout: 60000, // 60 seconds
            pingInterval: 25000, // 25 seconds
        });
        
        console.log("Socket.io server created");
        this.register();
    }


    

    private async getOrCreateAttempt(
        userId: string,
        quizId: number,
        clientAttemptId?: number,
        candidateName?: string
    ): Promise<{ attemptId: number; candidateName: string }> {
        let attemptId = clientAttemptId;
        let finalCandidateName = candidateName;

        if (!attemptId) {
            const user = await AppDataSource.getRepository(User).findOne({
                where: { auth0Id: userId },
                relations: ["candidate"]
            });

            if (user?.candidate) {
                const attemptRepo = AppDataSource.getRepository(QuizAttempt);
                const existingAttempt = await attemptRepo.findOne({
                    where: {
                        candidate: { candidate_id: user.candidate.candidate_id },
                        quiz: { quiz_id: quizId },
                        //submitted_at: ,
                    },
                    order: { created_at: "DESC" }
                });

                if (existingAttempt) {
                    attemptId = existingAttempt.attempt_id;
                    finalCandidateName = user.candidate.full_name;
                }
            }
        }

        if (!attemptId) {
            attemptId = await redis.incr('global:attempt_counter');
            
            await redis.hset(`attempt:temp:${attemptId}`, {
                userId,
                quizId: quizId.toString(),
                candidateName: finalCandidateName || `Candidate_${attemptId}`,
                createdAt: Date.now().toString(),
                isTemporary: "true"
            });
            
            finalCandidateName = finalCandidateName || `Candidate_${attemptId}`;
        }

        return { attemptId, candidateName: finalCandidateName! };
    }

    private register() {
        this.io.on("connection", async (socket: Socket) => {
            try {
                const token = socket.handshake.auth?.token;
                if (!token) {
                    console.error("No token in socket handshake");
                    return socket.disconnect();
                }

                const { sub: userId } = await verifyToken(token);
                
                await redis.set(`socket:${userId}`, socket.id);
                await redis.set(`socket:${socket.id}:user`, userId);

                socket.on("mentor_joined", async (quizId: number) => {
                    await redis.sadd(`quiz:${quizId}:mentors`, userId);
                    socket.join(`quiz:${quizId}`);
                    socket.join(`quiz:${quizId}:mentors`);
                    
                    console.log(`Mentor ${userId} joined quiz ${quizId}`);
                });

                socket.on("join_quiz", async (data: { 
                    quizId: number; 
                    attemptId?: number;
                    candidateName?: string;
                }) => {
                    const { quizId, attemptId, candidateName } = data;
                    
                    const { attemptId: finalAttemptId, candidateName: finalName } = 
                        await this.getOrCreateAttempt(userId, quizId, attemptId, candidateName);
                    
                    await redis.sadd(`quiz:${quizId}:candidates`, finalAttemptId.toString());
                    await redis.sadd(`quiz:${quizId}:users`, userId);
                    
                    await redis.hset(`candidate:${finalAttemptId}`, {
                        socketId: socket.id,
                        userId,
                        name: finalName,
                        quizId: quizId.toString(),
                        currentQuestion: "0",
                        joinedAt: Date.now().toString(),
                        isConnected: "true"
                    });
                    
                    await redis.hset(`user:${userId}:attempt:${quizId}`, {
                        attemptId: finalAttemptId.toString(),
                        candidateName: finalName
                    });

                    socket.join(`quiz:${quizId}`);
                    socket.join(`quiz:${quizId}:candidates`);
                    
                    socket.emit("join_quiz_ack", {
                        attemptId: finalAttemptId,
                        candidateName: finalName,
                        remainingTime: await redis.get(`quiz:${quizId}:remaining`),
                        leaderboard: await this.getLeaderboard(quizId)
                    });

                    this.io.to(`quiz:${quizId}:mentors`).emit("candidate_joined", {
                        candidateId: finalAttemptId,
                        candidateName: finalName,
                        quizId,
                        joinedAt: new Date()
                    });

                    console.log(`Candidate ${finalAttemptId} (${finalName}) joined quiz ${quizId}`);
                });

                socket.on("candidate_navigated", async (data: { 
                    quizId: number; 
                    attemptId?: number;
                    questionNo: number 
                }) => {
                    const { quizId, attemptId, questionNo } = data;
                    
                    let finalAttemptId = attemptId;
                    if (!finalAttemptId) {
                        const attemptData = await redis.hgetall(`user:${userId}:attempt:${quizId}`);
                        finalAttemptId = Number(attemptData.attemptId);
                    }
                    
                    if (!finalAttemptId) return;
                    
                    await redis.hset(`candidate:${finalAttemptId}`, {
                        currentQuestion: questionNo.toString(),
                        lastActivity: Date.now().toString()
                    });
                    
                    this.io.to(`quiz:${quizId}:mentors`).emit("candidate_progress", {
                        candidateId: finalAttemptId,
                        currentQuestionIndex: questionNo,
                        lastActivity: new Date()
                    });
                    
                    console.log(`Candidate ${finalAttemptId} navigated to question ${questionNo}`);
                });

                socket.on("answer_saved", async (data: {
                    quizId: number;
                    attemptId?: number;
                    questionId: number;
                    answer: string;
                }) => {
                    const { quizId, attemptId, questionId, answer } = data;
                    
                    let finalAttemptId = attemptId;
                    if (!finalAttemptId) {
                        const attemptData = await redis.hgetall(`user:${userId}:attempt:${quizId}`);
                        finalAttemptId = Number(attemptData.attemptId);
                    }
                    
                    if (!finalAttemptId) return;
                    
                    await redis.hset(`candidate:${finalAttemptId}:answers`, 
                        `q${questionId}`, answer
                    );
                    
                    this.io.to(`quiz:${quizId}:mentors`).emit("candidate_answer_saved", {
                        candidateId: finalAttemptId,
                        questionId,
                        answeredAt: new Date()
                    });
                    
                    console.log(`Candidate ${finalAttemptId} answered question ${questionId}`);
                });

                socket.on("candidate_submitted", async (data: {
                    quizId: number;
                    attemptId?: number;
                }) => {
                    const { quizId, attemptId } = data;
                    
                    let finalAttemptId = attemptId;
                    if (!finalAttemptId) {
                        const attemptData = await redis.hgetall(`user:${userId}:attempt:${quizId}`);
                        finalAttemptId = Number(attemptData.attemptId);
                    }
                    
                    if (!finalAttemptId) return;
                    
                    await this.processSubmission(finalAttemptId, quizId, userId);
                    
                    // Confirmation to candidate
                    socket.emit("submission_confirmed", { quizId });
                    
                    // Notification to  mentors
                    this.io.to(`quiz:${quizId}:mentors`).emit("candidate_submitted", {
                        candidateId: finalAttemptId,
                        quizId,
                        submittedAt: new Date()
                    });
                    
                    console.log(`Candidate ${finalAttemptId} submitted quiz ${quizId}`);
                });

                socket.on("disconnect", async () => {
                    const userId = await redis.get(`socket:${socket.id}:user`);
                    if (userId) {
                        await redis.del(`socket:${userId}`);
                        await redis.del(`socket:${socket.id}:user`);
                        
                        // Mark candidate as disconnected but keep data????
                        const attempts = await redis.keys(`user:${userId}:attempt:*`);
                        for (const key of attempts) {
                            const attemptId = key.split(':').pop();
                            if (attemptId) {
                                await redis.hset(`candidate:${attemptId}`, {
                                    isConnected: "false",
                                    disconnectedAt: Date.now().toString()
                                });
                            }
                        }
                    }
                });

            } catch (error) {
                console.error("Socket connection error:", error);
                socket.disconnect();
            }
        });
    }

    private async getLeaderboard(quizId: number): Promise<any[]> {
        const candidateIds = await redis.smembers(`quiz:${quizId}:candidates`);
        const leaderboard = [];
        
        for (const candidateId of candidateIds) {
            const candidateData = await redis.hgetall(`candidate:${candidateId}`);
            const answers = await redis.hgetall(`candidate:${candidateId}:answers`);
            
            leaderboard.push({
                candidateId: parseInt(candidateId),
                candidateName: candidateData.name,
                score: Object.keys(answers).length,
                currentQuestion: parseInt(candidateData.currentQuestion || "0"),
                lastActivity: new Date(parseInt(candidateData.lastActivity || "0"))
            });
        }
        
        return leaderboard.sort((a, b) => b.score - a.score);
    }

    private async processSubmission(attemptId: number, quizId: number, userId: string) {
        try {
            const answers = await redis.hgetall(`candidate:${attemptId}:answers`);
            
            const isTemp = await redis.exists(`attempt:temp:${attemptId}`);
            
            if (isTemp) {
                const tempData = await redis.hgetall(`attempt:temp:${attemptId}`);
                const user = await AppDataSource.getRepository(User).findOne({
                    where: { auth0Id: userId },
                    relations: ["candidate"]
                });
                
                if (user?.candidate) {
                    const quiz = await AppDataSource.getRepository('Quiz').findOne({
                        where: { quiz_id: quizId }
                    });
                    
                    if (quiz) {
                        const attemptRepo = AppDataSource.getRepository(QuizAttempt);
                        const realAttempt = attemptRepo.create({
                            candidate: user.candidate,
                            quiz: quiz,
                            total_questions: Number(await redis.get(`quiz:${quizId}:totalQuestions`)),
                            submitted_at: new Date()
                        });
                        
                        const savedAttempt = await attemptRepo.save(realAttempt);
                        
                        // TODO: Save answers to DB
                       
                        
                        // Cleanup temporary data
                        await redis.del(`attempt:temp:${attemptId}`);
                    }
                }
            }
            
            // Cleanup Redis data
            await redis.srem(`quiz:${quizId}:candidates`, attemptId.toString());
            await redis.del(`candidate:${attemptId}`);
            await redis.del(`candidate:${attemptId}:answers`);
            
        } catch (error) {
            console.error("Submission processing error:", error);
        }
    }

    // Event emission methods
    async emitToUser(userId: string, event: string, payload: any) {
        const socketId = await redis.get(`socket:${userId}`);
        if (socketId) this.io.to(socketId).emit(event, payload);
    }

    async emitToQuiz(quizId: number, event: string, payload: any) {
        const users = await redis.smembers(`quiz:${quizId}:users`);
        for (const userId of users) {
            const socketId = await redis.get(`socket:${userId}`);
            if (socketId) this.io.to(socketId).emit(event, payload);
        }
    }

    async emitToMentors(quizId: number, event: string, payload: any) {
        const mentors = await redis.smembers(`quiz:${quizId}:mentors`);
        for (const mentorId of mentors) {
            const socketId = await redis.get(`socket:${mentorId}`);
            if (socketId) this.io.to(socketId).emit(event, payload);
        }
    }

    async emitToCandidates(quizId: number, event: string, payload: any) {
        const candidates = await redis.smembers(`quiz:${quizId}:candidates`);
        for (const candidateId of candidates) {
            const candidateData = await redis.hgetall(`candidate:${candidateId}`);
            const socketId = candidateData.socketId;
            if (socketId) this.io.to(socketId).emit(event, payload);
        }
    }
}