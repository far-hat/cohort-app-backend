import { Server } from "socket.io";

export class SocketService {
  private io: Server;
  private quizRooms = new Map<number, Set<string>>(); // quiz_id -> client_ids
  private quizTimers = new Map<number, NodeJS.Timeout>();

  private quizMeta = new Map<number, { totalQuestions: number }>();

  private candidateProgress = new Map<number, Map<string, {
    socketId: string;
    candidateName: string;
    currentQuestionIndex: number;
    answers: Map<number, string>; // questionId → answer
    joinedAt: Date;
    lastActivity: Date;
  }>>();

  // When quiz starts - send ALL questions to candidates
  startQuizForCandidates(quizId: number, duration: number, questions: any[]) {
    if (!questions || !Array.isArray(questions)) {
      console.error(`❌ No questions provided for quiz ${quizId}`);
      questions = [];
    }

    console.log(`🚀 Starting quiz ${quizId} with ${questions.length} questions`);

    // Emit to candidates
    this.io.to(`candidates_${quizId}`).emit("quiz_started", {
      state: "active",
      quizId,
      duration,
      questions: questions.map((q, index) => ({
        question_id: q.question_id,
        question_text: q.question_text,
        options: q.options || [],
        question_number: index + 1,
        total_questions: questions.length
      })),
      startedAt: new Date()
    });

    // Emit to mentor too
    this.io.to(`mentor_${quizId}`).emit("quiz_started", {
      state: "active",
      quizId,
      duration,
      questions: questions.map((q, index) => ({
        question_id: q.question_id,
        question_text: q.question_text,
        question_number: index + 1,
        total_questions: questions.length
      })),
      startedAt: new Date()
    });

    // Start countdown timer
    this.startQuizTimer(quizId, duration);

    console.log(`🚀 Quiz ${quizId} started for candidates with ${questions.length} questions`);
  }

  // Timer implementation
  private startQuizTimer(quizId: number, duration: number) {
    // Clear existing timer if any
    if (this.quizTimers.has(quizId)) {
      clearInterval(this.quizTimers.get(quizId)!);
    }

    let remaining = duration;

    const timer = setInterval(() => {
      remaining -= 1;

      // Broadcast time update to candidates
      this.io.to(`candidates_${quizId}`).emit("time_update", {
        quizId,
        remainingTime: remaining
      });

      // broadcast to mentor
      this.io.to(`mentor_${quizId}`).emit("time_update", {
        quizId,
        remainingTime: remaining
      });

      // Time's up!
      if (remaining <= 0) {
        clearInterval(timer);
        this.quizTimers.delete(quizId);
        this.endQuizForCandidates(quizId);
      }
    }, 1000);

    this.quizTimers.set(quizId, timer);
    console.log(`⏰ Timer started for quiz ${quizId}: ${duration} seconds`);
  }

  // End quiz method
  private endQuizForCandidates(quizId: number) {
    console.log(`⏰ Time's up for quiz ${quizId}`);

    // Notify all candidates
    this.io.to(`candidates_${quizId}`).emit("quiz_ended", {
      quizId,
      reason: "time_up",
      endedAt: new Date()
    });

    // Notify mentor
    this.io.to(`mentor_${quizId}`).emit("quiz_ended", {
      quizId,
      reason: "time_up",
      endedAt: new Date()
    });

    // Process all candidate submissions
    const candidates = this.candidateProgress.get(quizId);
    if (candidates) {
      candidates.forEach((_, socketId) => {
        this.processCandidateSubmission(socketId, quizId);
      });
    }
  }

  constructor(server: any) {
    this.io = new Server(server, {
      cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true,
      },
      connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
        skipMiddlewares: true,
      }
    });

    this.setupSocketHandlers();

    // connection logging
    this.io.on("connection", (socket) => {
      console.log(`✅ Client connected: ${socket.id}`);
      console.log(`📊 Total clients: ${this.io.engine.clientsCount}`);
    });
  }

  private setupSocketHandlers() {
    this.io.on("connection", (socket) => {
      console.log("Client connected:", socket.id);

      // ✅ Join quiz room
      socket.on("join_quiz", (quizId: number) => {
        if (!quizId) {
          console.log("No quizId provided for join_quiz");
          return;
        }

        socket.join(`quiz_${quizId}`);
        socket.on("join_quiz", (quizId) => {
          socket.join(`quiz_${quizId}`);
        });


        if (!this.quizRooms.has(quizId)) {
          this.quizRooms.set(quizId, new Set());
        }

        this.quizRooms.get(quizId)!.add(socket.id);

        console.log(`Client ${socket.id} joined quiz ${quizId}`);
      });

      // Candidate joins as a participant
      socket.on("candidate_joined", (data: { quizId: number, candidateName?: string }) => {
        const { quizId, candidateName } = data;

        if (!quizId) {
          console.log("No Quiz Id provided for candidate_joined");
          return;
        }

        // Join necessary rooms
        socket.join(`quiz_${quizId}`);
        socket.join(`candidates_${quizId}`);

        // Leave mentor room if they were in it
        socket.leave(`mentor_${quizId}`);

        // Initialize candidate progress tracking
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

        console.log(`Candidate ${socket.id} (${candidateName || 'anonymous'}) joined Quiz ${quizId}`);

        // Notify mentor
        this.io.to(`mentor_${quizId}`).emit("candidate_joined", {
          candidateId: socket.id,
          candidateName: candidateName || `Candidate_${socket.id.slice(0, 6)}`,
          quizId,
          joinedAt: new Date()
        });
      });

      // Mentor joins mentor room
      socket.on("mentor_joined", (data: { quizId: number }) => {
        const { quizId } = data;
        socket.join(`mentor_${quizId}`);
        console.log(`Mentor ${socket.id} joined quiz ${quizId}`);
      });

      // Mentor starts quiz - triggered from frontend
      socket.on("mentor_start_quiz", (data: {
        quizId: number;
        duration: number;
        questions: any[];
      }) => {
        const { quizId, duration, questions } = data;

        console.log(`👨‍🏫 Mentor requested to start quiz ${quizId} with ${questions?.length || 0} questions`);

        if (!questions || questions.length === 0) {
          console.error(`❌ No questions provided for quiz ${quizId}`);
          socket.emit("error", { message: "No questions available for this quiz" });
          return;
        }

        this.startQuizForCandidates(quizId, duration, questions);
      });

      // Candidate navigates to different question
      socket.on("candidate_navigated", (data: { quizId: number, questionIndex: number }) => {
        const { quizId, questionIndex } = data;

        if (!this.candidateProgress.has(quizId)) {
          console.log(`No candidates found for quiz ${quizId}`);
          return;
        }

        const candidateData = this.candidateProgress.get(quizId)!.get(socket.id);

        if (candidateData) {
          candidateData.currentQuestionIndex = questionIndex;
          candidateData.lastActivity = new Date();

          // Get total questions from quiz timer/state
const totalQuestions =
  this.quizMeta.get(quizId)?.totalQuestions || 0;

          console.log(`📊 Candidate ${socket.id} moved to question ${questionIndex + 1} in quiz ${quizId}`);

          // Notify mentor candidate progress
          this.io.to(`mentor_${quizId}`).emit("candidate_progress", {
            candidateId: socket.id,
            candidateName: candidateData.candidateName,
            quizId,
            currentQuestionIndex: questionIndex + 1,
            totalQuestions: totalQuestions,
            lastActivity: candidateData.lastActivity,
          });
        }
      });

      // Candidate answers a question
      socket.on("candidate_answered", (data: {
        quizId: number,
        questionId: number,
        answer: string,
      }) => {
        const { quizId, questionId, answer } = data;

        if (!this.candidateProgress.has(quizId)) return;

        const candidateData = this.candidateProgress.get(quizId)!.get(socket.id);

        if (candidateData) {
          candidateData.answers.set(questionId, answer);
          candidateData.lastActivity = new Date();

          console.log(`Candidate ${socket.id} answered question ${questionId}: ${answer}`);

          // Notify mentor without revealing answers
          this.io.to(`mentor_${quizId}`).emit("candidate_answer_saved", {
            candidateId: socket.id,
            candidateName: candidateData.candidateName,
            quizId,
            questionId,
            hasAnswered: true,
            answeredAt: candidateData.lastActivity,
          });
        }
      });

      socket.on("candidate_submitted", (data: { quizId: number }) => {
        const { quizId } = data;

        console.log(`🏁 Candidate ${socket.id} submitted quiz ${quizId} early`);

        // Save to DB / Calculate score
        this.processCandidateSubmission(socket.id, quizId);

        // Notify mentor 
        this.io.to(`mentor_${quizId}`).emit("candidate_submitted", {
          candidateId: socket.id,
          quizId,
          submittedAt: new Date()
        });

        // Notify candidate
        socket.emit("submission_confirmed", {
          quizId,
          message: "Quiz has been submitted successfully"
        });
      });

      // Leave quiz room
      socket.on("leave_quiz", (quizId: number) => {
        socket.leave(`quiz_${quizId}`);
        socket.leave(`candidates_${quizId}`);
        socket.leave(`mentor_${quizId}`);

        this.quizRooms.get(quizId)?.delete(socket.id);

        // Clean up candidate progress tracking
        if (this.candidateProgress.has(quizId)) {
          this.candidateProgress.get(quizId)!.delete(socket.id);
        }

        console.log(`Client ${socket.id} left quiz ${quizId}`);
      });

      // Cleanup on disconnect
      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);

        // Clean up for all rooms
        this.quizRooms.forEach((clients, quizId) => {
          clients.delete(socket.id);

          // Clean up candidate progress
          if (this.candidateProgress.has(quizId)) {
            this.candidateProgress.get(quizId)!.delete(socket.id);
          }
        });
      });
    });
  }

  private processCandidateSubmission(socketId: string, quizId: number) {
    // Get candidate's answers
    const candidateData = this.candidateProgress.get(quizId)?.get(socketId);
    if (!candidateData) return;

    // 1. Save answers to database
    // 2. Calculate score
    // 3. Store attempt record

    console.log(`Processing submission for ${socketId} in quiz ${quizId}`);
    console.log(`Answers:`, Object.fromEntries(candidateData.answers.entries()));

    // Clean up after submission
    this.candidateProgress.get(quizId)?.delete(socketId);
  }

  // Event broadcast
  broadcastToQuiz(quizId: number, event: string, payload: any) {
    this.io.to(`quiz_${quizId}`).emit(event, payload);

    // Return number of clients
    return this.quizRooms.get(quizId)?.size || 0;
  }

  // Method to start quiz (to be called from QuizSessionService)
  startQuiz(quizId: number, duration: number, questions: any[]) {
    this.startQuizForCandidates(quizId, duration, questions);
  }

  // Method to stop quiz manually
  stopQuiz(quizId: number) {
    // Clear timer
    if (this.quizTimers.has(quizId)) {
      clearInterval(this.quizTimers.get(quizId)!);
      this.quizTimers.delete(quizId);
    }

    this.endQuizForCandidates(quizId);
  }
}